// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./StrategyManager.sol";

abstract contract StrategyFeeManager is StrategyManager {

    // Fee structure
    uint256 public WITHDRAWAL_MAX = 100000;
    uint256 public WITHDRAW_FEE = 0;  //0%  (amount *withdrawalFee/WITHDRAWAL_MAX)

    uint256 public MAX_FEE = 1000;
    uint256 public CALL_FEE = 125;  //12.5% of Platform fee  (CALL_FEE/MAX_FEE * Platform fee = 0.5%)
    uint256 public FEE_BATCH = 875; //87.5% of Platform fee  (FEE_BATCH/MAX_FEE * Platform fee = 3.5%)
    
    uint256 public PLATFORM_FEE = 40; //4% Platform fee (PLATFORM_FEE / MAX_FEE)

    function setFees(uint256 newCallFee, uint256 newWithdrawFee, uint256 newFeeBatchAmount) external {
        require(msg.sender == governance);
        require(newWithdrawFee <= 5000, "withdraw fee too high");
        CALL_FEE = newCallFee;
        WITHDRAW_FEE = newWithdrawFee;
        FEE_BATCH = newFeeBatchAmount;
    }
    function setWithdrawFee(uint256 newWithdrawFee) external {
        require(msg.sender == governance);
        require(newWithdrawFee <= 5000, "withdraw fee too high");
        WITHDRAW_FEE = newWithdrawFee;
    }

}