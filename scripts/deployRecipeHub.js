async function main() {
  const RecipeHub = await ethers.getContractFactory("RecipeHub");
  const hub = await RecipeHub.deploy();

  console.log("RecipeHub deployed to: ", hub.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
