async function main() {
  // We get the contract to deploy
  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy();

  console.log("Faucet deployed to: ", faucet.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
