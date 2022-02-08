const { hexValue } = require('ethers/lib/utils');
const { ethers, upgrades } = require('hardhat');


const tokens = {
  want:       ethers.utils.getAddress("0xc5713B6a0F26bf0fdC1c52B90cd184D950be515C"),     // linspirit    
  output:     ethers.utils.getAddress("0x5Cc61A78F164885776AA610fb0FE1257df78E59B"),    // spirit
  wrapped:    ethers.utils.getAddress("0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"),    // wFtm
  zero:       ethers.utils.getAddress("0x0000000000000000000000000000000000000000"),
}

const route = [tokens.output, tokens.wrapped]
const unirouter = ethers.utils.getAddress("0x20dd72ed959b6147912c2e529f0a0c651c33c9ce")

const approvalDelay = 86400 //day
const tokenSymbol = "testStakedLinSpirit"
const tokenName = "tSLinSpirit"


const chefPoolId = 0
const wantPoolId = hexValue("0x30a92a4eeca857445f41e4bb836e64d66920f1c0000200000000000000000071")
const nativeSwapPoolId = hexValue("0x30a92a4eeca857445f41e4bb836e64d66920f1c0000200000000000000000071")

async function main () {
    
    console.log('Deploying Contract...');
    strategyFactory = await ethers.getContractFactory("StrategyAutoLinSpirit");
    vaultFactory = await ethers.getContractFactory("LiquidAutoVaultV1");

    strategyContract = await strategyFactory.deploy(chefPoolId, wantPoolId, nativeSwapPoolId, unirouter, route);
    txDeployed = await strategyContract.deployed();
    vaultContract = await vaultFactory.deploy(strategyContract.address, tokenName, tokenSymbol , approvalDelay);
    txDeployed = await vaultContract.deployed();
    
    console.log('Contract StrategyAutoLinSpirit deployed to:', strategyContract.address);
    console.log('Contract LiquidAutoVaultV1 deployed to:', vaultContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });