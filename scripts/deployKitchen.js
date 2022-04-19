async function main() {
  const Kitchen = await ethers.getContractFactory("Kitchen");
  const kitchen = await Kitchen.deploy();

  console.log("Kitchen deployed to: ", kitchen.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
