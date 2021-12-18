// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// it calls Ice but it farms Spell
interface IBeethovenxChef {
    function pendingBeets(uint256 _pid, address _user) external view returns (uint256);

    function deposit(uint256 _pid,uint256 _amount,address _to) external;

    function harvest(uint256 _pid, address _to) external;

    function withdrawAndHarvest(uint256 _pid, uint256 _amount, address _to) external;

    function userInfo(uint256, address) external view returns (uint256 amount, uint256 rewardDebt);

    function emergencyWithdraw(uint256 _pid, address to) external;


}