import React, { useEffect } from 'react';
import HyphenContext from './HyphenContext';
import MutableStringSet from "./MutableStringSet.js";
import RecipeViewer from "./RecipeViewer.js";
import RecipeHub from 'contracts/RecipeHub.sol/RecipeHub.json';
import RecipeSpace from 'contracts/RecipeSpace.sol/RecipeSpace.json';
import RecipeSet from 'contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from 'contracts/Recipe.sol/Recipe.json';
import Select from 'react-select';
import Blockies from 'react-blockies';
const ethers = require("ethers");

// Reverse lookups for enum types :/
// Wish this was in the abi.
const RecipeSpaceChangeType = {
    created: 0,
    updated: 1,
    removed: 2
};

const RecipeChangeType = {
    started: 0,
    updated: 1,
    ended: 2
};

class PreparationCreator extends React.Component {

    constructor(props) {
        super(props);
        this.state = {scale: 1.0}
    }

    componentDidMount() {
        new ethers.Contract("recipes.hyphen", RecipeSet.abi, this.context.signer)
            .contents()
            .then((recipes) => {
              this.setState({
                recipes: recipes
              });
            });
    }

    onScaleChanged = (event) => {
        const e = Math.pow(2, event.target.value - 4);
        const scale = e >= 4 ? e.toFixed(0) : e < 1 ? e.toFixed(2) : e.toFixed(1);
        this.setState({scale: scale});
    };

    startRecipe = () => {
        if (!this.state.recipe) {
            return;
        }
        this.props.startRecipe(
            this.state.recipe,
            (this.state.scale * 100).toFixed(0));
    };

    onSelectRecipe = (recipeOption) => {
        this.setState({
            recipe: recipeOption.value
        });
    };

    render() {
        const recipeOptions = this.state.recipes && this.state.recipes.map((recipe, index) => {
            return {label: recipe.name, value: recipe.recipe};
        });

        const scaleRangeValue = Math.log2(this.state.scale) + 4;

        const submitButton = this.state.recipe ?
            <button onClick={this.startRecipe}>Create preparation</button> :
            null;

        var selectedRecipeOption = this.state.recipe && recipeOptions.find((option) => {
            return option.value == this.state.recipe;
        });

        return <div>
            <Select
                options={recipeOptions}
                value={selectedRecipeOption}
                onChange={this.onSelectRecipe} />
            <label>
            <input
                type="range"
                min="1"
                max="8"
                step="0.01"
                id="myRange"
                value={scaleRangeValue}
                onInput={this.onScaleChanged}
                style={{width: "100%"}}
            />
                <span>{this.state.scale}x</span>
            </label>
            {submitButton}
            <button onClick={this.props.cancel}>Cancel</button>
        </div>;
    }
}

PreparationCreator.contextType = HyphenContext;

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
            new ethers.Contract(recipeAddress, Recipe.abi, this.context.signer)
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

PreparationList.contextType = HyphenContext;

class RecipeSpaceDetail extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            editing: false
        };
    }

    startRecipe = (recipe, scalePercentage) => {
        this.setState({editing: false}, () => {
            this.props.startRecipe(recipe, scalePercentage);
        });
    };

    startEditingRecipe = () => {
        this.setState({editing: true});
    };

    stopEditingRecipe = () => {
        this.setState({editing: false});
    };

    render() {
        const selectedRecipeData = this.props.spaceData.recipes[this.props.selectedRecipeIndex];
        const recipeViewer = selectedRecipeData ?
            <RecipeViewer
                recipe={selectedRecipeData.recipe}
                stepIndex={selectedRecipeData.status.stepIndex.toNumber()}
                scalePercentage={selectedRecipeData.status.scalePercentage.toNumber()} /> : null;

        var activeRecipeDetails = null;
        if (this.props.spaceData) {
            const selectedActiveRecipe =
                this.props.selectedRecipeIndex === null ?
                    null :
                    this.props.spaceData.recipes[this.props.selectedRecipeIndex];
            activeRecipeDetails = this.props.spaceData.recipes.map((activeRecipe, index) => {
                const isSelected = index === this.props.selectedRecipeIndex;
                const nextStepIndex = activeRecipe.status.stepIndex.toNumber() + 1;
                const isCompleted = nextStepIndex === activeRecipe.recipe.steps.length + 1;
                const recipeLabel = <span>{activeRecipe.recipe.name}</span>;
                const stepLabel = <span>Step {nextStepIndex}/{activeRecipe.recipe.steps.length}</span>;
                const progressLabel = isCompleted ? <span>Completed! ✔️</span> : stepLabel;
                const scaleLabel = <span>{(activeRecipe.status.scalePercentage.toNumber() / 100).toFixed(2)}x</span>;
                const completeStepButton = !isSelected || (isCompleted) ? null :
                        <button onClick={() => this.props.updateRecipeStep(activeRecipe.recipe.recipe, nextStepIndex) }>Complete step</button>;
                const removeRecipeButton = !isSelected ? null :
                    <button onClick={() => this.props.removeRecipe(activeRecipe.recipe.recipe)}>❌</button>;
                return <div className="pure-g pure-u-1-3" key={activeRecipe.recipe.recipe} onClick={() => this.props.selectRecipeIndex(index)}>
                    <div className="pure-u-1-1">{recipeLabel}</div>
                    <div className="pure-u-1-1">{scaleLabel}</div>
                    <div className="pure-u-1-1">{progressLabel}</div>
                    <div className="pure-u-1-1">{completeStepButton}</div>
                    <div className="pure-u-1-1">{removeRecipeButton}</div>
                </div>;
            });
        }

        const addRecipeButton = this.state.editing ? null : <button onClick={this.startEditingRecipe}>Add recipe</button>;
        const editingControls = this.state.editing ?
            <PreparationCreator
                startRecipe={this.startRecipe}
                cancel={this.stopEditingRecipe}/> : null;

        const removeRecipe = !this.state.editing && this.state.viewerRecipe ?
            () => this.props.removeRecipe(this.state.viewerRecipe.recipe) : null;

        return <div className="pure-g">
            <div className="pure-u-1-1">
                {addRecipeButton}
            </div>
            <div className="pure-u-1-1">
                {activeRecipeDetails}
            </div>
            <div className="pure-u-1-1">
                {editingControls}
            </div>
            <div className="pure-u-1-1">
                {recipeViewer}
            </div>
        </div>;
    }
}

class RecipePreparation extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
          selectedRecipeIndex: 0,
          date: new Date()
        };
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps, prevState) {
      if (prevState.date.toDateString() !== this.state.date.toDateString() ||
        prevProps.blockNumber !== this.props.blockNumber
      ) {
        this.update();
      }
    }

    getHubContract = () => {
        return new ethers.Contract(
            "recipehub.hyphen",
            RecipeHub.abi,
            this.context.signer);
    };

    update = () => {
        this.getHubContract()
            .recipeSpaceByName(this.state.date.toDateString())
            .then((space) => {
                new ethers.Contract(space, RecipeSpace.abi, this.context.signer)
                    .getData()
                    .catch((error) => {
                        this.setState({
                            selectedSpace: null,
                            spaceData: null
                        })
                    })
                    .then((spaceData) => {
                        this.setState({
                            selectedSpace: space,
                            spaceData: spaceData
                        });
                    })
            }, (reason) => {
                this.setState({
                    selectedSpace: null,
                    spaceData: null
                });
            });
    };

    createRecipeSpace = (name) => {
        this.context.executeTransaction(
            this.getHubContract().createRecipeSpace(name),
            () => {},
            (reason) => {});
    };

    removeRecipeSpace = (index) => {
        const space = this.state.spaces[index];
        this.context.executeTransaction(
            this.getHubContract().removeRecipeSpace(space.address),
            () => {},
            (reason) => {});
    };

    startRecipeInSpace = (space, recipe, scalePercentage) => {
        this.context.executeTransaction(
            this.getHubContract().startRecipeInSpace(space, recipe, scalePercentage),
            () => {},
            (reason) => {});
    };

    removeRecipeFromSpace = (space, recipe) => {
        this.context.executeTransaction(
            this.getHubContract().endRecipeInSpace(space, recipe),
            () => {},
            (reason) => {});
    };

    updateRecipeStepInSpace = (space, recipe, stepIndex) => {
        this.context.executeTransaction(
            this.getHubContract().updateRecipeStepInSpace(space, recipe, stepIndex),
            () => {},
            (reason) => {});
    };

    addDays = (date, days) => {
        var date = new Date(date.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    selectTomorrow = () => {
        this.setState({
            selectedRecipeIndex: 0,
            date: this.addDays(this.state.date, 1)
        });
    };

    selectYesterday = () => {
       this.setState({
            selectedRecipeIndex: 0,
            date: this.addDays(this.state.date, -1)
        });
    };

    selectRecipeIndex = (index) => {
        this.setState({selectedRecipeIndex: index});
    };

    render() {
        const currentDate = this.state.date.toDateString();
        const selectedSpaceDetail = this.state.spaceData ?
            <RecipeSpaceDetail
                selectedRecipeIndex={this.state.selectedRecipeIndex}
                selectRecipeIndex={this.selectRecipeIndex}
                spaceData={this.state.spaceData}
                startRecipe={(recipe, scalePercentage) => this.startRecipeInSpace(this.state.selectedSpace, recipe, scalePercentage)}
                removeRecipe={(recipe) => this.removeRecipeFromSpace(this.state.selectedSpace, recipe)}
                updateRecipeStep={(recipe, stepIndex) => this.updateRecipeStepInSpace(this.state.selectedSpace, recipe, stepIndex)}/> :
            <button onClick={() => this.createRecipeSpace(currentDate)}>New recipe group</button>;

        return <div>
            <div className="pure-g">
                <div className="pure-u-1-1" style={{display: "flex", justifyContent: "space-between"}}>
                    <button onClick={this.selectYesterday}><span>&lt;</span></button>
                    <span>{currentDate}</span>
                    <button onClick={this.selectTomorrow}><span>&gt;</span></button>
                </div>
                <div className="pure-g pure-u-1-1">
                    {selectedSpaceDetail}
                </div>
            </div>
        </div>;
    }
}

RecipePreparation.contextType = HyphenContext;

export default RecipePreparation;
