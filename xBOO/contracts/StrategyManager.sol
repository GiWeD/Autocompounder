// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


contract StrategyManager is Ownable, Pausable {

    address public vault;
    address public liquidFeeAddress;
    address public harvester;
    address public governance;
    address public callFeeRecipient;
    address public unirouter;

    mapping (address => bool) public harvesters;
    constructor() Ownable() public {}

    modifier onlyManager() {
        require(msg.sender == owner() || msg.sender == governance, "!manager");
        _;
    }

    modifier onlyWhitelisted() {
        require(harvesters[msg.sender] == true, "You are not whitelisted");
        _;
    }

    function whitelistHarvesters(address[] calldata _harvesters) external {
        require(msg.sender == governance || harvesters[msg.sender], "not authorized");
                
        for (uint i = 0; i < _harvesters.length; i ++) {
            harvesters[_harvesters[i]] = true;
        }
    }
    function revokeHarvesters(address[] calldata _harvesters) external {
        require(msg.sender == governance, "not authorized");
        for (uint i = 0; i < _harvesters.length; i ++) {
            harvesters[_harvesters[i]] = false;
        }
    }

    function setVault(address _vault) external onlyManager {
        require(_vault != address(0), 'zeroAddress');
        vault = _vault;
    }

    function setGovernance(address _governance) external onlyManager {
        require(_governance != address(0), 'zeroAddress');
        governance = _governance;
    }
    
    function setCallFeeRecipient(address _callFeeRecipient) external onlyManager {
        require(_callFeeRecipient != address(0), 'zeroAddress');
        callFeeRecipient = _callFeeRecipient;
    }

    function setLiquidFeeAddress(address _liquidFeeAddress) external onlyManager {
        require(_liquidFeeAddress != address(0), 'zeroAddress');
        liquidFeeAddress = _liquidFeeAddress;
    }

    function setUnirouter(address _unirouter) external onlyOwner {
        require(_unirouter != address(0), 'zeroAddress');
        unirouter = _unirouter;
    }

    function beforeDeposit() external virtual {}
}