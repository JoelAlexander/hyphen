async function main() {
  // We get the contract to deploy
  const Recipe = await ethers.getContractFactory("Recipe");
  const recipe = await Recipe.deploy(
  	"0x7c65D04C226d47fA70ba3f1913443684547AF18F",
  	"Example",
  	[
  		[
  			"Ingredient 1",
  			"Unit 1",
  			1
  		],
  		[
  			"Ingredient 2",
  			"Unit 2",
  			2
  		]
  	],
  	["Step 1"],
  	{gasPrice:100000000000});
  console.log("Recipe deployed to: ", recipe.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
