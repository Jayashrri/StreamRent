require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    matic: {
      url: "https://rpc-mumbai.maticvigil.com/v1/1600ce5a1b33046f97cafcd25cba2051f9531c03",
      accounts: [],
      chainId: 80001,
    },
    goerli: {
      url: "https://goerli.infura.io/v3/261d35fa4090436ea9ba64ff93392027",
      accounts: [],
      gas: 9500000
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/261d35fa4090436ea9ba64ff93392027",
      accounts: [],
      gas: 9500000
    }
  },
};
