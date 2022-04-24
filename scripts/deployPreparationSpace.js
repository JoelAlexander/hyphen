async function main() {
  const PreparationSpace = await ethers.getContractFactory("PreparationSpace");
  const space = await PreparationSpace.deploy();

  console.log("PreparationSpace deployed to: ", space.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
