require("@nomiclabs/hardhat-waffle");

require('@openzeppelin/hardhat-upgrades');

require("@nomiclabs/hardhat-etherscan");



module.exports = {
  // latest Solidity version
  solidity: {
    compilers: [
        {
          version: "0.6.12"
        }
    ]
  },

  networks: {
    // fantomTestnet network specification
    fantomTestnet: {
      url: `https://rpc.testnet.fantom.network`,
      chainId: 0xfa2,
      //accounts: [`0x${""}`]
    },
    // fantomOpera network specification
    fantomOpera: {
      url: `https://rpcapi.fantom.network`,
      chainId: 250,
      //accounts: [privateKey]
    },
    hardhat: {
      forking: {
          url: "https://rpc.ftm.tools", // command line:  npx hardhat node --fork https://rpcapi.fantom.network,
      },
      //accounts: []
    }
  
  },
/*
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ""
  }*/

  
}
