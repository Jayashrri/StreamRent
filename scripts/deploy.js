const { ethers } = require("hardhat");
const SuperfluidSDK = require("@superfluid-finance/js-sdk");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with account: ", deployer.address);

  const sf = new SuperfluidSDK.Framework({
    ethers: ethers.provider,
    tokens: ["fDAI"],
  });

  await sf.initialize();

  const Asset = await ethers.getContractFactory("Asset");
  const asset = await Asset.deploy(
    "Asset Token",
    "AST",
    sf.host.address,
    sf.agreements.cfa.address,
    sf.tokens.fDAIx.address
  );

  console.log("Contract address: ", asset.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
