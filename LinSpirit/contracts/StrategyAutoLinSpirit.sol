// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./StrategyManager.sol";
import "./StrategyFeeManager.sol";
import "./interfaces/IBalancerVault.sol";
import "./interfaces/ILinSpiritChef.sol";
import "./interfaces/IUniswapRouterETH.sol";


contract StrategyAutoLinSpirit is StrategyManager, StrategyFeeManager {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    address public want = address(0xc5713B6a0F26bf0fdC1c52B90cd184D950be515C);      // linSpirit    
    address public output = address(0x5Cc61A78F164885776AA610fb0FE1257df78E59B);    // spirit
    address public wrapped = address(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);   // wFtm
    address public spiritRouter = address(0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52);       
    address[] public lpTokens;

    // Third party contracts
    address public input = address(0xc5713B6a0F26bf0fdC1c52B90cd184D950be515C); // linSpirit
    address public chef = address(0x1CC765cD7baDf46A215bD142846595594AD4ffe3);
    uint256 public chefPoolId;
    bytes32 public wantPoolId;  
    bytes32 public inputSwapPoolId;
    address[] public routeOutputWrapped;
    
    IBalancerVault.SwapKind public swapKind;
    IBalancerVault.FundManagement public funds;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);

    constructor(
        uint256 _chefPoolId,
        bytes32 _wantPoolId,
        bytes32 _nativeSwapPoolId,
        address _unirouter,
        address[] memory _routeOutputWrapped
    )   
        StrategyManager()
        public 
    {
        wantPoolId = _wantPoolId;
        inputSwapPoolId = _nativeSwapPoolId;
        chefPoolId = _chefPoolId;
        unirouter = _unirouter;

        governance = msg.sender;

        routeOutputWrapped = _routeOutputWrapped;

        (lpTokens,,) = IBalancerVault(unirouter).getPoolTokens(wantPoolId);
        swapKind = IBalancerVault.SwapKind.GIVEN_IN;
        funds = IBalancerVault.FundManagement(address(this), false, payable(address(this)), false);

        _giveAllowances();
    }

    
    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal > 0) {
            ILinSpiritChef(chef).deposit(chefPoolId, wantBal, address(this));
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal < _amount) {
            uint256 missing = _amount.sub(wantBal);
            ILinSpiritChef(chef).withdrawAndHarvest(chefPoolId, missing, address(this));
            wantBal = IERC20(want).balanceOf(address(this));
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin != owner() && !paused()) {
            uint256 withdrawalFeeAmount = wantBal.mul(WITHDRAW_FEE).div(WITHDRAWAL_MAX);
            wantBal = wantBal.sub(withdrawalFeeAmount);
        }

        IERC20(want).safeTransfer(vault, wantBal);

        emit Withdraw(balanceOf());
    }

    function beforeDeposit() external override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest();
        }
    }

    function harvest() external virtual {
        _harvest();
    }

    function managerHarvest() external onlyManager {
        _harvest();
    }

    // compounds earnings and charges performance fee
    function _harvest() internal whenNotPaused onlyWhitelisted {
        ILinSpiritChef(chef).harvest(chefPoolId, address(this));
        uint256 outputBal = IERC20(output).balanceOf(address(this));
        if (outputBal > 0) {
            chargeFees();

            outputBal = IERC20(output).balanceOf(address(this));
            balancerSwap(inputSwapPoolId, output, input, outputBal);

            uint256 wantHarvested = balanceOfWant();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    // performance fees
    function chargeFees() internal {
        uint256 towrapped = IERC20(output).balanceOf(address(this));
        if (input != wrapped) {
            towrapped = towrapped.mul(PLATFORM_FEE).div(MAX_FEE);
        }
        
        spiritSwap(towrapped, routeOutputWrapped);

        uint256 wrappedBal = IERC20(wrapped).balanceOf(address(this));
        if (input == wrapped) {
            wrappedBal = wrappedBal.mul(PLATFORM_FEE).div(MAX_FEE);
        }
        
        uint256 callFeeAmount = wrappedBal.mul(CALL_FEE).div(MAX_FEE); 
        IERC20(wrapped).safeTransfer(callFeeRecipient, callFeeAmount);

        uint256 liquidFeeAmount = wrappedBal.mul(FEE_BATCH).div(MAX_FEE);
        IERC20(wrapped).safeTransfer(liquidFeeAddress, liquidFeeAmount);

    }

    function balancerSwap(bytes32 _poolId, address _tokenIn, address _tokenOut, uint256 _amountIn) internal returns (uint256) {
        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap(_poolId, swapKind, _tokenIn, _tokenOut, _amountIn, "");
        return IBalancerVault(unirouter).swap(singleSwap, funds, 1, now);
    }

    function spiritSwap(uint256 _amountIn, address[] memory route) internal returns (uint256) {
        IUniswapRouterETH(spiritRouter).swapExactTokensForTokens(_amountIn, 0, route, address(this), now);
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        (uint256 _amount,) = ILinSpiritChef(chef).userInfo(chefPoolId, address(this));
        return _amount;
    }

   
    // returns rewards unharvested
    function rewardsAvailable() public view returns (uint256) {
        return ILinSpiritChef(chef).pendingSpirit(chefPoolId, address(this));
    }

    // wrapped reward amount for calling harvest
    function callReward() public returns (uint256) {
        ILinSpiritChef(chef).harvest(chefPoolId, address(this));
        uint256 outputBal = IERC20(output).balanceOf(address(this));
        uint256 wrappedOut;
        if (outputBal > 0) {
            spiritSwap(outputBal, routeOutputWrapped);
            wrappedOut = IERC20(wrapped).balanceOf(address(this));
        }
        return wrappedOut.mul(PLATFORM_FEE).div(1000).mul(CALL_FEE).div(MAX_FEE);
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
        if (harvestOnDeposit) {
            WITHDRAW_FEE = 0;
        } else {
            WITHDRAW_FEE = 100;
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        ILinSpiritChef(chef).emergencyWithdraw(chefPoolId, address(this));

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        ILinSpiritChef(chef).emergencyWithdraw(chefPoolId, address(this));
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(chef, uint256(-1));
        IERC20(output).safeApprove(unirouter, uint256(-1));

        
        IERC20(output).safeApprove(spiritRouter, 0);
        IERC20(wrapped).safeApprove(spiritRouter, 0);
        IERC20(output).safeApprove(spiritRouter, uint256(-1));
        IERC20(wrapped).safeApprove(spiritRouter, uint256(-1));

        IERC20(input).safeApprove(unirouter, 0);
        IERC20(input).safeApprove(unirouter, uint256(-1));
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(chef, 0);
        IERC20(output).safeApprove(spiritRouter, 0);
        IERC20(output).safeApprove(unirouter, 0);
        IERC20(input).safeApprove(unirouter, 0);
    }
   
}