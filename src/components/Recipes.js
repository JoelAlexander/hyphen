import React from 'react';
import HyphenContext from './HyphenContext';
import StringSet from 'contracts/StringSet.sol/StringSet.json';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import RecipeViewer from './RecipeViewer.js';
import { threeOrFewerDecimalPlaces } from '../Utils';
import Select from 'react-select';
const ethers = require("ethers");

class RecipeMenu extends React.Component {

  render() {
    var recipeOptions;
    if (this.props.recipes) {
      recipeOptions = this.props.recipes.map((recipe, index) => {
        return {label: recipe.name, value: index};
      });
    }

    var selectedRecipeOption;
    if (this.props.selectedRecipe !== null) {
      selectedRecipeOption = recipeOptions[this.props.selectedRecipe];
    }

    const onSelectRecipe = (recipeOption) => {
      this.props.selectRecipe(recipeOption.value);
    };

    var recipeSelect;
    if (recipeOptions) {
      recipeSelect = <Select
        value={selectedRecipeOption}
        options={recipeOptions}
        onChange={onSelectRecipe}/>;
    }

    return <div style={{marginBottom: "2em"}}>
      {recipeSelect}
      <button onClick={this.props.newRecipe}>New Recipe</button>
    </div>;
  }
}


class RecipeEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.recipe ? props.recipe.name : '',
      ingredients: props.recipe ? props.recipe.ingredients : [['', '', 0], ['', '', 0]],
      steps: props.recipe ? props.recipe.steps : ['']
    };
  }

  componentDidMount() {
    this.props.onRecipeChanged(this.getRecipe());
    this.updateParent = setInterval(() => this.props.onRecipeChanged(this.getRecipe()), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.updateParent);
  }

  handleNameChange = (event) => {
    this.setState({
      name: event.target.value
    });
  };

  handleIngredientNameChange = (index, value) => {
    var newIngredients = this.state.ingredients.slice();
    newIngredients[index][0] = value;

    if (index === this.state.ingredients.length - 1 && value !== "") {
      newIngredients.push(['', '', 0]);
    } else {
      var shrinkBy = 0;
      for (var i = newIngredients.length - 1; i >= 1 && newIngredients[i][0].length === 0 && newIngredients[i - 1][0].length === 0; i--) {
        shrinkBy++;
      }
      newIngredients = newIngredients.slice(0, newIngredients.length - Math.min(shrinkBy, newIngredients.length - 2));
    }

    this.setState({
        ingredients: newIngredients
    });
  };

  handleIngredientUnitChange = (index, value) => {
    const newIngredients = this.state.ingredients.slice();
    newIngredients[index][1] = value;
    this.setState({
      ingredients: newIngredients
    });
  };

  handleIngredientAmountChange = (index, value) => {
    const newIngredients = this.state.ingredients.slice();
    newIngredients[index][2] = value === "" ? value : Math.floor(value * 1000);
    this.setState({
      ingredients: newIngredients
    });
  };

  handleStepChange = (index, value) => {
    var newSteps = this.state.steps.slice();
    newSteps[index] = value;

    if (index === this.state.steps.length - 1 && value !== "") {
      newSteps.push("");
    } else {
      var shrinkBy = 0;
      for (var i = newSteps.length - 1; i >= 1 && newSteps[i].length === 0 && newSteps[i - 1].length === 0; i--) {
        shrinkBy++;
      }
      newSteps = newSteps.slice(0, newSteps.length - Math.min(shrinkBy, newSteps.length - 1));
    }

    this.setState({
      steps: newSteps
    });
  };

  addStep = () => {
    const newSteps = this.state.steps.slice();
    newSteps.push('');
    this.setState({
      steps: newSteps
    });
  };

  removeStep = (index) => {
    if (this.state.pendingInputs.steps.length > 1) {
      const newSteps = this.state.steps.slice();
      newSteps.remove(index);
      this.setState({
        steps: newSteps
      });
    }
  };

  getRecipe = () => {
    return {
      name: this.state.name,
      ingredients: this.state.ingredients
                    .filter((ingredient) => ingredient[0].length > 0)
                    .map(([name, unit, amount]) => [name, unit, amount === "" ? 0 : amount]),
      steps: this.state.steps.filter((step) => step.length > 0)
    };
  };

  isValidRecipe = (recipe) => {
    return recipe.name.length > 0 && recipe.ingredients.length > 1 && recipe.steps.length > 0;
  };

  render() {
    const ingredientInputs =
      this.state.ingredients.map((ingredient, index) => {
        const name = 'Ingredient ' + (index + 1);
        const units = [''].concat(this.props.measures);
        const unitOptions = units.map((unit) => {
          const label = unit.length == 0 ? 'None' : unit;
          return {value:unit, label:label}
        });

        const selectedUnitOption = unitOptions.find((option) => {
          return option.value === this.state.ingredients[index][1];
        });

        const amount =
          this.state.ingredients[index][2] === "" ?
          this.state.ingredients[index][2] : threeOrFewerDecimalPlaces(this.state.ingredients[index][2] / 1000);

        return <div key={name} className="pure-g">
            <div className="pure-u-1-3"><label>
              <input
                type="text"
                value={this.state.ingredients[index][0]}
                onChange={(event) => this.handleIngredientNameChange(index, event.target.value)}
                onFocus={() => this.handleIngredientNameChange(index, this.state.ingredients[index][0]) } /></label>
            </div>
            <div className="pure-u-1-3"><label>
              <input
                type="number"
                step="0.001"
                value={amount}
                min="0"
                onChange={(event) => this.handleIngredientAmountChange(index, event.target.value)}/></label>
            </div>
            <div className="pure-u-1-3"><label>
              <Select
                value={selectedUnitOption}
                options={unitOptions}
                onChange={(event) => this.handleIngredientUnitChange(index, event.value)}/></label>
            </div>
          </div>;
      });

    const stepInputs =
      this.state.steps.map((step, index) => {
        const name = 'Step ' + (index + 1);
        const label = (index + 1).toString() + '.';
        return <label key={name}>
          {label}
          <input
            type="text"
            name={name}
            value={this.state.steps[index]}
            onChange={(event) => this.handleStepChange(index, event.target.value)}
            onFocus={() => this.handleStepChange(index, this.state.steps[index])} />
        </label>
      });

    var submitButton = null;
    if (this.isValidRecipe(this.getRecipe())) {
      submitButton = <input onClick={this.props.commit} type="submit" value="Submit Recipe" />;
    }

    return <div style={{marginBottom: "2em"}}>
        <h3>New recipe</h3>
        <form className="recipe-form">
        <label>Recipe Name
          <input type="text" name="name" value={this.state.name} onChange={this.handleNameChange} />
        </label>
        <label>Ingredients
          <div className="pure-g">
            <div className="pure-u-1-3">Ingredient Name</div>
            <div className="pure-u-1-3">Amount</div>
            <div className="pure-u-1-3">Units</div>
          </div>
          {ingredientInputs}
        </label>
        <label>Steps
          {stepInputs}
        </label>
      </form>
      {submitButton}
      <button onClick={this.props.stopEditing}>Cancel</button>
    </div>;
  }
}

class Recipes extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      recipes: null,
      measures: [],
      editing: false,
      editedRecipe: null,
      selectedRecipe: null
    };
  };

  componentDidMount() {
    const measuresContract =
      new ethers.Contract(
        this.props.measuresSetAddress,
        StringSet.abi,
        this.context.signer);

    this.getContract()
      .contents()
      .then((recipes) => {
        this.setState({recipes: recipes});
      }, (err) => {
        this.props.addMessage(JSON.stringify(err));
      });

    measuresContract.contents().then((measures) => {
      this.setState({measures: measures});
    }, (err) => {
      this.props.addMessage(JSON.stringify(err));
    });
  }

  getContract = () => {
    return new ethers.Contract(
      this.props.contractAddress,
      RecipeSet.abi,
      this.context.signer);
  };

  selectRecipe = (index) => {
    this.setState({selectedRecipe:index});
  };

  addEditedRecipe = () => {
    this.context.executeTransaction(
      this.getContract().create(
        this.state.editedRecipe.name,
        this.state.editedRecipe.ingredients,
        this.state.editedRecipe.steps),
      () => this.setState({selectedRecipe: null, editing: false, editedRecipe: null}, this.update),
      (err) => this.props.addMessage(JSON.stringify(err)));
  };

  removeRecipe = (recipeAddress) => {
    this.context.executeTransaction(
      this.getContract().remove(recipeAddress),
      () => this.setState({selectedRecipe: null, editing: false, editedRecipe: null}, this.update),
      (err) => this.props.addMessage(JSON.stringify(err)));
  };

  updateEditedRecipe = (recipe) => {
    this.setState({editedRecipe: recipe});
  };

  startEditing = (existingRecipe) => {
    var editedRecipe = null;
    if (existingRecipe) {
      editedRecipe = {
        name: existingRecipe.name,
        ingredients: existingRecipe.ingredients.map(([name, unit, amount]) => {
          return [name, unit, amount.toNumber()];
        }),
        steps: existingRecipe.steps
      }
    }
    this.setState({editing: true, editedRecipe: editedRecipe});
  };

  stopEditing = () => {
    this.setState({editing: false, editedRecipe: null});
  };

  render() {
    const displayRecipe =
      this.state.editing && this.state.editedRecipe ||
      (this.state.recipes && this.state.selectedRecipe !== null && this.state.recipes[this.state.selectedRecipe]);

    var topContent;
    if (this.state.editing) {
      topContent = <RecipeEditor
        recipe={this.state.editedRecipe}
        measures={this.state.measures}
        onRecipeChanged={this.updateEditedRecipe}
        stopEditing={this.stopEditing}
        addMessage={this.props.addMessage}
        commit={this.addEditedRecipe}/>;
    } else {
      topContent = <RecipeMenu
        newRecipe={() => this.startEditing(null)}
        selectedRecipe={this.state.selectedRecipe}
        recipes={this.state.recipes}
        selectRecipe={this.selectRecipe}/>;
    }

    return <div>
      {topContent}
      <RecipeViewer
        recipe={displayRecipe}
        startEditing={this.startEditing}
        removeRecipe={this.removeRecipe}/>
    </div>;
  }
}

Recipes.contextType = HyphenContext;

export default Recipes;
