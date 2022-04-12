async function main() {
  // We get the contract to deploy
  const ENS = await ethers.getContractFactory("ENSDeployment");
  const ens = await ENS.deploy();

  console.log("ENS deployed to: ", ens.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
