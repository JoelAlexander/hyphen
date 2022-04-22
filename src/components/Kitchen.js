import React, { useEffect } from 'react';
import MutableStringSet from "./MutableStringSet.js";
import PreparationSpace from './../contracts/PreparationSpace.sol/PreparationSpace.json';
import RecipeSet from './../contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from './../contracts/Recipe.sol/Recipe.json';
import Select from 'react-select';
const ethers = require("ethers");

class PreparationCreator extends React.Component {

    constructor(props) {
        super(props);
        this.state = {scale: 1.0}
    }

    onScaleChanged = (event) => {
        const e = Math.pow(2, event.target.value - 4);
        const scale = e >= 4 ? e.toFixed(0) : e < 1 ? e.toFixed(2) : e.toFixed(1);
        this.setState({scale: scale})
    };

    createPreparation = () => {
        if (!this.state.recipe) {
            return;
        }
        this.props.createPreparation(
            this.state.recipe,
            (this.state.scale * 100).toFixed(0));
    };

    onSelectRecipe = (recipeOption) => {
        this.setState({
            recipe: recipeOption.value
        });
    };

    render() {
        const recipeOptions = this.props.recipes && this.props.recipes.map((recipe, index) => {
            return {label: recipe.name, value: recipe.recipe};
        });

        const scaleRangeValue = Math.log2(this.state.scale) + 4;

        const submitButton = this.state.recipe ?
            <button onClick={this.createPreparation}>Create preparation</button> :
            null;

        var selectedRecipeOption = this.props.recipe && this.props.recipeOptions.find((option) => {
            return option.value == this.props.recipe;
        });

        return <div>
            <Select
                options={recipeOptions}
                value={selectedRecipeOption}
                onChange={this.onSelectRecipe} />
            <label>
            <input type="range" min="1" max="8" step="0.01" id="myRange" value={scaleRangeValue} onInput={this.onScaleChanged} />
                <p>{this.state.scale}x</p>
            </label>
            {submitButton}
        </div>;
    }
}

class PreparationList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            recipeData: {}
        };
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.preparations !== this.props.preparations) {
            this.update();
        }
    }

    update = () => {
        this.props.preparations.forEach((preparation) => {
            const recipeAddress = preparation.recipe;
            this.props.accessDeployedContract(recipeAddress, Recipe.abi)
                .getData()
                .then((recipeData) => {
                    this.setState({
                        recipeData: {
                            ...this.state.recipeData,
                            [recipeAddress]: recipeData
                        }
                    });
                });
        });
    };

    render() {
        const preparations = this.props.preparations
            .map((preparation) => {
                const recipeData = this.state.recipeData[preparation.recipe];
                return <div key={preparation.recipe}>
                    <p>{recipeData && recipeData.name}</p>
                    <button onClick={() => this.props.removePreparation(preparation.recipe)}>Remove</button>
                </div>;
            });
        return <div>
            {preparations}
        </div>;
    }
}

class Kitchen extends React.Component {

    constructor(props) {
        super(props);            
        this.state = {
            preparations: []
        };
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.blockNumber !== this.props.blockNumber) {
            this.props.preparationSpace
                .queryFilter("PreparationUpdated", this.props.blockNumber)
                .then(this.processUpdates);            
        }
    }

    processUpdates = (updatedPreparationEvents) => {
        if (updatedPreparationEvents.length === 0) {
            return;
        }

        this.props.serviceWorkerRegistration.showNotification("Something changed!");
        var newPreparations = this.state.preparations.slice();
        updatedPreparationEvents.forEach((preparationEvent) => {
            if (preparationEvent.args.preparation.status.scalePercentage.eq(0)) {
                newPreparations = newPreparations.filter((existing) => existing.recipe !== preparationEvent.args.preparation.recipe);
            } else if (preparationEvent.args.preparation.status.stepIndex.eq(0)) {
                newPreparations.push(preparationEvent.args.preparation);
            } else {
                newPreparations = newPreparations.map((existing) => {
                    if (existing.recipe === preparationEvent.args.preparation) {
                        return preparationEvent.args.preparation;
                    } else {
                        return existing;
                    }
                });
            }
        });
        this.setState({preparations: newPreparations});
    };

    update = () => {
        this.props
            .accessDeployedContract(
                "0x12c881C1a099FA31400fCe0fba10553B134679C5",
                RecipeSet.abi)
            .contents()
            .then((recipes) => {
              this.setState({
                recipes: recipes
              });
            });
        this.props.preparationSpace
            .activePreparations()
            .then((preparations) => {
                this.setState({preparations: preparations});
            });
    };

    createPreparation = (recipe, scalePercentage) => {
        this.props.executeTransaction(
            this.props.preparationSpace.startRecipe(recipe, scalePercentage),
            () => {},
            (reason) => { this.props.addMessage(JSON.stringify(reason)); });
    };

    removePreparation = (recipe) => {
        this.props.executeTransaction(
            this.props.preparationSpace.stopPreparation(recipe),
            () => {},
            (reason) => { this.props.addMessage(JSON.stringify(reason)); });
    };

    render() {

        return <div>
            <PreparationCreator
                recipes={this.state.recipes}
                createPreparation={this.createPreparation} />
            <PreparationList
                preparations={this.state.preparations}
                accessDeployedContract={this.props.accessDeployedContract}
                removePreparation={this.removePreparation} />

{/*         Uncomment to access the units list.
            <h4>Unit measures</h4>
            <MutableStringSet
                addMessage={this.props.addMessage}
                executeTransaction={this.props.executeTransaction}
                accessDeployedContract={this.props.accessDeployedContract}
                contractAddress="0x9679BAF3E60479a31095AC6134C54b7F54b6ce4C" />*/}
        </div>;
    }
}

export default Kitchen;
