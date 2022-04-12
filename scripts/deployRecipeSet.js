async function main() {
  const Contract = await ethers.getContractFactory("RecipeSet");
  const contract = await Contract.deploy({gasPrice:100000000000});
  console.log("Deployed to: ", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
