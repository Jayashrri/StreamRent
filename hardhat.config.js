require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    matic: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: [],
      chainId: 80001,
    },
  },
};
