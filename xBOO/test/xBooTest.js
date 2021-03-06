
const web3 = require("web3");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const { erc20Abi } = require("../Abi.js");  //spiritContract = new ethers.Contract(spirit, erc20Abi, owner)


const harvester = ethers.utils.getAddress("0xa65DD8C7d05fDd80Eb30Bd38841F2fa9d5EF07D5")
const impersonator = [  ethers.utils.getAddress("0x95478c4f7d22d1048f46100001c2c69d2ba57380"),
                        ethers.utils.getAddress("0xf778f4d7a14a8cb73d5261f9c61970ef4e7d7842"),
                        ethers.utils.getAddress("0x1f0c5a9046f0db0e8b651cd9e8e23ba4efe4b86d"),
                        ethers.utils.getAddress("0xf778f4d7a14a8cb73d5261f9c61970ef4e7d7842")]
                    
const tokens = {
    want:       ethers.utils.getAddress("0x841fad6eae12c286d1fd18d1d525dffa75c7effe"),  // boo
    wrapped:    ethers.utils.getAddress("0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"),  // wFtm
    bar:        ethers.utils.getAddress("0xa48d959ae2e88f1daa7d5f611e01908106de7598"),  // xBoo
    zero:       ethers.utils.getAddress("0x0000000000000000000000000000000000000000")
}

const unirouter = ethers.utils.getAddress("0xf491e7b69e4244ad4002bc14e878a34207e38c29") 

const approvalDelay = 86400 //day
const tokenSymbol = "LD-XBOO"
const tokenName = "liquidXBOO"


describe("----------------------------------------\n----------------------------------------\n" +
            "Strategy xBOO: deployment and settings", function () {

    it("Should Deploy StrategyXBoo, get governance and check owner", async function () {

        accounts = await ethers.getSigners();
        owner = accounts[0]
        liquidFee = accounts[1]
        callFeeRecipient = accounts[2]
        
        wantContract = new ethers.Contract(tokens.want, erc20Abi, owner)
        // deploy
        data = await ethers.getContractFactory("StrategyAutoXBoo");
        chefPoolId = 2
        chef = ethers.utils.getAddress("0x2352b745561e7e6fcd03c093ce7220e3e126ace0") 

        outputToNativeRoute = [tokens.wrapped] 
        outputToWantRoute = [tokens.wrapped, tokens.want]

        strategyContract = await data.deploy(tokens.want, tokens.bar, chefPoolId, chef, tokens.zero,unirouter,owner.address,outputToNativeRoute, outputToWantRoute);
        txDeployed = await strategyContract.deployed();

        // check gov
        expect(await strategyContract.governance()).to.equal(owner.address);
        expect(await strategyContract.owner()).to.equal(owner.address);

    });
    
    it("Should Set Harvesters: [owner.address, harvester]", async function () {
        harvesters = [owner.address, harvester]
        await strategyContract.whitelistHarvesters(harvesters)
        expect(await strategyContract.harvesters(owner.address)).to.equal(true)
        expect(await strategyContract.harvesters(harvester)).to.equal(true)
    });

    it("Should Revoke Harvesters: [harvester]", async function () {
        harvesters = [harvester]
        await strategyContract.revokeHarvesters(harvesters)
        expect(await strategyContract.harvesters(owner.address)).to.equal(true)
        expect(await strategyContract.harvesters(harvester)).to.equal(false)
    });

    it("Should Set CallFeeRecipient", async function () {
        await strategyContract.setCallFeeRecipient(callFeeRecipient.address)
        expect(await strategyContract.callFeeRecipient()).to.equal(callFeeRecipient.address)
    });

    it("Should Set liquidFeeAddress", async function () {
        await strategyContract.setLiquidFeeAddress(liquidFee.address)
        expect(await strategyContract.liquidFeeAddress()).to.equal(liquidFee.address)
    });

    it("Should set Harvest on Deposit to False", async function () {
        await strategyContract.setHarvestOnDeposit(false)
        expect(await strategyContract.harvestOnDeposit()).to.equal(false)
    });

    it("Should set WITHDRAW_FEE to 0", async function () {
        await strategyContract.setWithdrawFee(0)
        expect(await strategyContract.WITHDRAW_FEE()).to.equal(0)
    });

});

describe("Vault for xBOO Strategy: deployment and settings", function () {

    it("Should Deploy LiquidSingleYieldVaultV1: check owner", async function () {

        // deploy
        data = await ethers.getContractFactory("LiquidSingleYieldVaultV1");
        vaultContract = await data.deploy(strategyContract.address, tokenName, tokenSymbol , approvalDelay);
        txDeployed = await vaultContract.deployed();
        // check owner
        expect(await vaultContract.owner()).to.equal(owner.address);
    });

    
    it("Should check vault.want()", async function () {
        expect(await vaultContract.want()).to.equal(ethers.utils.getAddress(tokens.want))
    });


    it("Should check name and symbol", async function () {
        tokenSymbolTemp = await vaultContract.symbol()
        tokenNameTemp = await vaultContract.name()

        expect(tokenSymbolTemp).to.equal(tokenSymbol)
        expect(tokenNameTemp).to.equal(tokenName)

    });

    it("Should have PricePerFullShare = 1", async function () {
        pricePerShare = await vaultContract.getPricePerFullShare()
        expect(pricePerShare).to.equal(ethers.utils.parseEther("1"))
    });

    it("Should set Vault Address to strategy", async function () {
        await strategyContract.setVault(vaultContract.address)
        expect(await strategyContract.vault()).to.equal(vaultContract.address)
    });
    
});

describe("User Interaction", function () {

    
    it("Should Deposit for User 0", async function () {
           
        userToTest = impersonator[0]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        user0Balance = await wantContract.balanceOf(signer.address)

        await wantContract.connect(signer).approve(vaultContract.address, user0Balance)
        await vaultContract.connect(signer).deposit(user0Balance)
        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        strategyBalance = await strategyContract.balanceOf()

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
   

    });

    it("Should Deposit for User 1", async function () {
           
        userToTest = impersonator[1]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)

        user1Balance = await wantContract.balanceOf(signer.address)
        pricePerShare = await vaultContract.getPricePerFullShare()

        await wantContract.connect(signer).approve(vaultContract.address, user1Balance)
        await vaultContract.connect(signer).deposit(user1Balance)

        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

    });

    it("Should Deposit for User 2", async function () {
           
        userToTest = impersonator[2]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)

        user2Balance = await wantContract.balanceOf(signer.address) 
        await wantContract.connect(signer).approve(vaultContract.address, user2Balance)
        await vaultContract.connect(signer).deposit(user2Balance)

        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

    });

    it("Should Harvest and have fees", async function () { 

        //move blocks 1day
        const evmTime = 86400;
        await ethers.provider.send('evm_increaseTime', [evmTime]);
        await ethers.provider.send('evm_mine');
        

        rewards = await strategyContract.rewardsAvailable()
        wFtmContract = new ethers.Contract(tokens.wrapped, erc20Abi, owner)
        balanceOwnerBeforeHarvest = await wFtmContract.balanceOf(liquidFee.address)
        balanceCallFeeBeforeHarvest = await wFtmContract.balanceOf(callFeeRecipient.address)

        await strategyContract.connect(owner).harvest()

        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)

        strategyBalance = await strategyContract.balanceOf() 
        balanceOwnerAfterHarvest = await wFtmContract.balanceOf(liquidFee.address)
        balanceCallFeeAfterHarvest = await wFtmContract.balanceOf(callFeeRecipient.address)
        expect(balanceOwnerAfterHarvest).to.be.above(balanceOwnerBeforeHarvest)
        expect(balanceCallFeeAfterHarvest).to.be.above(balanceCallFeeBeforeHarvest)
        
    });

    it("Should Withdraw for User 1,2", async function () {       
        userToTest = impersonator[1]  
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        toWithdraw = await vaultContract.balanceOf(userToTest)
        await vaultContract.connect(signer).withdraw(toWithdraw)

        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user1Balance))
        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

        userToTest = impersonator[2]  
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        toWithdraw = await vaultContract.balanceOf(userToTest)
        await vaultContract.connect(signer).withdraw(toWithdraw)

        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user2Balance))
        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
    });

    it("Should Deposit for User 3 using depositAll()", async function () {       
        userToTest = impersonator[3]  
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        user3Balance = await wantContract.balanceOf(signer.address) 
        await wantContract.connect(signer).approve(vaultContract.address, user3Balance)
        await vaultContract.connect(signer).depositAll()

        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 

        expect(await vaultContract.getPricePerFullShare()).to.be.above(pricePerShare)

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
    });

    it("Should Withdraw for User 3", async function () {       
        userToTest = impersonator[3]  
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        toWithdraw = await vaultContract.balanceOf(userToTest)
        await vaultContract.connect(signer).withdraw(toWithdraw)

        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user3Balance))
        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
    });

    it("Should Withdraw for User 0 using withdrawAll()", async function () {       
        userToTest = impersonator[0]  
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        await vaultContract.connect(signer).withdrawAll()

        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user0Balance))
        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)
        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
    });

});

describe("Security", function () {

    
    it("Should Pause the contract and stop deposit+harvest", async function () {
        await strategyContract.pause()
        // deposit should fail
        userToTest = impersonator[0]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        user0Balance = await wantContract.balanceOf(signer.address) 
        await wantContract.connect(signer).approve(vaultContract.address, user0Balance)
        tx = vaultContract.connect(signer).deposit(user0Balance)
        await expect(tx).to.be.revertedWith('Pausable: paused')
        
        tx = strategyContract.harvest()
        await expect(tx).to.be.revertedWith('Pausable: paused')

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

    });

    it("Should UnPause the contract and allow deposit+withdraw", async function () {

        await strategyContract.unpause()
        userToTest = impersonator[3] 

        // deposit and withdraw
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });

        signer = await ethers.getSigner(userToTest)
        user3Balance = await wantContract.balanceOf(signer.address) 
        await wantContract.connect(signer).approve(vaultContract.address, user3Balance)
        await vaultContract.connect(signer).depositAll()


        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)


        strategyBalance = await strategyContract.balanceOf() 
        await vaultContract.connect(signer).withdrawAll()

        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user3Balance))

        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)


        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

    });


    it("Should Panic", async function () {
        // deposit
        userToTest = impersonator[0]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)

        user0Balance = await wantContract.balanceOf(userToTest) 
        await wantContract.connect(signer).approve(vaultContract.address, user0Balance)
        await vaultContract.connect(signer).deposit(user0Balance)
        expect(await wantContract.balanceOf(userToTest) ).to.equal(0)

        await strategyContract.panic() 
        
        // withdrawAll should work
        await vaultContract.connect(signer).withdrawAll()
        expect(Number(await wantContract.balanceOf(userToTest))).to.greaterThanOrEqual(Number(user0Balance))
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });  
                
        // deposit should fail
        userToTest = impersonator[1]
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        user1Balance = await wantContract.balanceOf(userToTest) 
        await wantContract.connect(signer).approve(vaultContract.address, user1Balance)
        tx = vaultContract.connect(signer).deposit(user1Balance)
        await expect(tx).to.be.revertedWith('Pausable: paused')
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });

             
    });

    it("Should UnPause the contract and allow deposit+withdraw", async function () {

        await strategyContract.unpause()
        userToTest = impersonator[3] 
        // deposit and withdraw
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [userToTest],
        });
        signer = await ethers.getSigner(userToTest)
        user3Balance = await wantContract.balanceOf(signer.address) 

        await wantContract.connect(signer).approve(vaultContract.address, user3Balance)
        await vaultContract.connect(signer).depositAll()
        expect(await wantContract.balanceOf(signer.address)).to.equal(0)
        expect(await strategyContract.balanceOf()).to.be.above(strategyBalance)

        strategyBalance = await strategyContract.balanceOf() 
        await vaultContract.connect(signer).withdrawAll()
        expect(Number(await wantContract.balanceOf(signer.address))).to.greaterThanOrEqual(Number(user3Balance))
        expect(await strategyContract.balanceOf()).to.be.below(strategyBalance)

        strategyBalance = await strategyContract.balanceOf() 
        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [userToTest],
        });
    });

});

describe("Upgrade Strategy", function () {

    
    it("Should propose a new strategy", async function () {
        // deploy
        data = await ethers.getContractFactory("StrategyAutoXBoo");
        newStrategyContract = await data.deploy(tokens.want, tokens.bar, chefPoolId, chef, tokens.zero,unirouter,owner.address,outputToNativeRoute, outputToWantRoute);
        txDeployed = await newStrategyContract.deployed();

        // check gov
        expect(await strategyContract.governance()).to.equal(owner.address);
        expect(await strategyContract.owner()).to.equal(owner.address);

        await newStrategyContract.setVault(vaultContract.address)
        expect(await newStrategyContract.vault()).to.equal(vaultContract.address)

        await vaultContract.proposeStrat(newStrategyContract.address);
        candidate = await vaultContract.stratCandidate()
        expect(candidate[0]).to.equal(newStrategyContract.address)
        
    });

    it("Should fail upgrade strat 'Delay has not passed'", async function () {
        //move blocks 12h
        const evmTime = 33200;
        await ethers.provider.send('evm_increaseTime', [evmTime]);
        await ethers.provider.send('evm_mine');

        tx = vaultContract.upgradeStrat()

        await expect(tx).to.be.revertedWith('Delay has not passed')
    });

    it("Should upgrade strategy", async function () {
        //move blocks 1day
        const evmTime = 86400;
        await ethers.provider.send('evm_increaseTime', [evmTime]);
        await ethers.provider.send('evm_mine');

        await vaultContract.upgradeStrat()
        expect(await vaultContract.strategy()).to.equal(newStrategyContract.address)
        
    });

    it("Should fail upgrade strat 'There is no candidate'", async function () {
        //move blocks 12h
        const evmTime = 33200;
        await ethers.provider.send('evm_increaseTime', [evmTime]);
        await ethers.provider.send('evm_mine');

        tx = vaultContract.upgradeStrat()

        await expect(tx).to.be.revertedWith('There is no candidate')
    });


});




