// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./StrategyManager.sol";

abstract contract StrategyFeeManager is StrategyManager {

    // Fee structure
    uint256 public WITHDRAWAL_MAX = 100000;
    uint256 public WITHDRAW_FEE = 0;  //0%  (amount *withdrawalFee/WITHDRAWAL_MAX)

    uint256 public MAX_FEE = 1000;

    uint256 public PLATFORM_FEE = 10; //1% Platform fee (PLATFORM_FEE / MAX_FEE)

    function setFees(uint256 newPlatformFee) external {
        require(msg.sender == governance);
        PLATFORM_FEE = newPlatformFee;
    }
    function setWithdrawFee(uint256 newWithdrawFee) external {
        require(msg.sender == governance);
        require(newWithdrawFee <= 5000, "withdraw fee too high");
        WITHDRAW_FEE = newWithdrawFee;
    }

}