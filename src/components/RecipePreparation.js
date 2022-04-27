import React, { useEffect } from 'react';
import MutableStringSet from "./MutableStringSet.js";
import RecipeViewer from "./RecipeViewer.js";
import RecipeHub from './../contracts/RecipeHub.sol/RecipeHub.json';
import RecipeSpace from './../contracts/RecipeSpace.sol/RecipeSpace.json';
import RecipeSet from './../contracts/RecipeSet.sol/RecipeSet.json';
import Recipe from './../contracts/Recipe.sol/Recipe.json';
import Select from 'react-select';
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
        const recipeOptions = this.props.recipes && this.props.recipes.map((recipe, index) => {
            return {label: recipe.name, value: recipe.recipe};
        });

        const scaleRangeValue = Math.log2(this.state.scale) + 4;

        const submitButton = this.state.recipe ?
            <button onClick={this.startRecipe}>Create preparation</button> :
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
            <button onClick={this.props.cancel}>Cancel</button>
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

class RecipeSpaceDetail extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            editing: false,
            selectedRecipeIndex: null,
            viewerRecipe: null,
            viewerScalePercentage: null
        };
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.activeRecipes !== this.props.activeRecipes) {
            this.update();
        }
    }

    update = () => {
        Promise.all(
            this.props.activeRecipes.map((activeRecipe) => {
                return this.props.accessDeployedContract(
                    activeRecipe.recipe,
                    Recipe.abi)
                .getData();
            })).then((loadedRecipes) => {
            this.setState({loadedRecipes: loadedRecipes});
        });
    };

    startRecipe = (recipe, scalePercentage) => {
        this.setState({editing: false}, () => {
            this.props.startRecipe(recipe, scalePercentage);
        });
    };

    getRecipeData = (recipe) => {
        if (!this.state.loadedRecipes) return undefined;
        return this.state.loadedRecipes.find(loadedRecipe => loadedRecipe.recipe === recipe);
    };

    startEditingRecipe = () => {
        this.setState({
            editing: true,
            viewerRecipe: null,
            viewerScalePercentage: null
        });
    };

    stopEditingRecipe = () => {
        this.setState({editing: false});
    };

    selectActiveRecipe = (index) => {
        const activeRecipe = this.props.activeRecipes[index];
        const recipeData = this.getRecipeData(activeRecipe.recipe);
        this.setState({
            selectedRecipeIndex: index,
            viewerRecipe: recipeData,
            viewerScalePercentage: activeRecipe.scalePercentage
        });
    }; 

    setPreviewRecipe = (recipe, scalePercentage) => {
        this.setState({
            selectedRecipeIndex: null,
            viewerRecipe: recipe,
            viewerScalePercentage: scalePercentage
        });
    };

    render() {
        const selectedActiveRecipe = this.state.selectedRecipeIndex === null ?
            null : this.props.activeRecipes[this.state.selectedRecipeIndex]
        const activeRecipeDetails = this.props.activeRecipes.map((activeRecipe, index) => {
            const recipeData = this.getRecipeData(activeRecipe.recipe);
            const isSelected = index === this.state.selectedRecipeIndex;
            const nextStepIndex = activeRecipe.stepIndex.toNumber() + 1;
            const isCompleted = recipeData && (nextStepIndex === recipeData.steps.length + 1);
            const recipeLabel = recipeData ? <h4>{recipeData && recipeData.name}</h4> : null;
            const stepLabel = recipeData ? <p>Step {nextStepIndex}/{recipeData.steps.length}</p> : null;
            const progressLabel = isCompleted ? <p>Completed! ✔️</p> : stepLabel;
            const scaleLabel = recipeData ? <p>{(activeRecipe.scalePercentage.toNumber() / 100).toFixed(2)}x</p> : null;
            const completeStepButton = !isSelected || (isCompleted) ? null :
                    <button onClick={() => this.props.updateRecipeStep(activeRecipe.recipe, nextStepIndex) }>Complete step</button>;
            const removeRecipeButton = !isSelected ? null :
                <button onClick={() => this.props.removeRecipe(activeRecipe.recipe)}>❌</button>;
            return <div key={activeRecipe.recipe} onClick={() => this.selectActiveRecipe(index)}>
                <div className="pure-g">
                    <div className="pure-u-1-1">{recipeLabel}</div>
                    <div className="pure-u-1-3">{scaleLabel}</div>
                    <div className="pure-u-1-3">{progressLabel}</div>
                    <div className="pure-u-1-1">{completeStepButton}</div>
                    <div className="pure-u-1-1">{removeRecipeButton}</div>
                </div>
            </div>;
        });

        const editingControls = this.state.editing ?
            <PreparationCreator
                recipes={this.props.recipes}
                startRecipe={this.startRecipe}
                cancel={this.stopEditingRecipe} /> :
            <button onClick={this.startEditingRecipe}>Add recipe</button>;

        const removeRecipe = !this.state.editing && this.state.viewerRecipe ?
            () => this.props.removeRecipe(this.state.viewerRecipe.recipe) : null;
        const recipeViewer =  this.state.viewerRecipe ?
            <RecipeViewer
                provider={this.props.provider}
                recipe={this.state.viewerRecipe}
                stepIndex={selectedActiveRecipe && selectedActiveRecipe.stepIndex.toNumber()}
                scalePercentage={this.state.viewerScalePercentage} /> : null;

        return <div className="pure-g">
            <div className="pure-u-1-3">
                {activeRecipeDetails}
                {editingControls}
            </div>
            <div className="pure-u-2-3">
                {recipeViewer}
            </div>
        </div>;
    }
}

class RecipePreparation extends React.Component {

    constructor(props) {
        super(props);            
        this.state = {
          hub: this.props.accessDeployedContract("0xB7b16a382e5B9EA1bA66C64608e87bA98b448b80", RecipeHub.abi),
          spaces: [],
          selectedSpaceIndex: 0
        };
    }

    componentDidMount() {
        this.update();
    }

    componentDidUpdate(prevProps) {
      if (prevProps.blockNumber < this.props.blockNumber) {
        const startBlock = prevProps.blockNumber + 1;
        this.state.hub
            .queryFilter("RecipeSpaceChanged", startBlock, this.props.blockNumber)
            .then(this.onRecipeSpaceChanges);
      }
    }

    onRecipeSpaceChanges = (changeEvents) => {
        if (changeEvents.length === 0) {
            return;
        }

        var updatedSpaces = this.state.spaces.slice();
        var toUpdate = [];
        changeEvents.forEach((event) => {
            switch(event.args.changeType) {
                case RecipeSpaceChangeType['created']:
                    updatedSpaces.push({
                        address: event.args.recipeSpace,
                        activeRecipes: []
                    });
                    break;
                case RecipeSpaceChangeType['updated']:
                    toUpdate.push(event.args.recipeSpace);
                    break;
                case RecipeSpaceChangeType['removed']:
                    updatedSpaces = updatedSpaces.filter((space) => {
                        return space.address !== event.args.recipeSpace
                    });
                    break;
                default:
                    break;
            }
        });

        this.setState({spaces: updatedSpaces}, () => {
            Promise.all(toUpdate.map((space) => {
                return this.props.accessDeployedContract(space, RecipeSpace.abi)
                    .activeRecipes()
                    .then((activeRecipes) => [space, activeRecipes]);
            })).then((updates) => {
                var updatedSpaces2 = this.state.spaces.slice();
                updates.forEach(([space, activeRecipes]) => {
                    const found = updatedSpaces2.findIndex((loadedSpace) => loadedSpace.address === space);
                    if (found !== -1) {
                        updatedSpaces2[found].activeRecipes = activeRecipes;
                    }
                });
                this.setState({spaces: updatedSpaces2});
            });
        });
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

        this.state.hub
            .activeRecipeSpaces()
            .then((spaces) => {
                Promise.all(
                    spaces.map((space) => {
                        return this.props.accessDeployedContract(space, RecipeSpace.abi)
                            .activeRecipes()
                            .then((activeRecipes) => {
                                return {
                                    address: space,
                                    activeRecipes: activeRecipes
                                };
                            })
                })).then((spaces) => {
                    this.setState({
                        spaces: spaces
                    });
                });
            });
    };

    createRecipeSpace = () => {
        this.props.executeTransaction(
            this.state.hub.createRecipeSpace(),
            () => {},
            (reason) => {});
    };

    removeRecipeSpace = (index) => {
        const space = this.state.spaces[index];
        this.props.executeTransaction(
            this.state.hub.removeRecipeSpace(space.address),
            () => {},
            (reason) => {});
    };

    startRecipeInSpace = (space, recipe, scalePercentage) => {
        this.props.executeTransaction(
            this.state.hub.startRecipeInSpace(space, recipe, scalePercentage),
            () => {},
            (reason) => {});
    };

    removeRecipeFromSpace = (space, recipe) => {
        this.props.executeTransaction(
            this.state.hub.endRecipeInSpace(space, recipe),
            () => {},
            (reason) => {});
    };

    updateRecipeStepInSpace = (space, recipe, stepIndex) => {
        this.props.executeTransaction(
            this.state.hub.updateRecipeStepInSpace(space, recipe, stepIndex),
            () => {},
            (reason) => {});
    };

    selectRecipeSpace = (index) => {
        this.setState({
            selectedSpaceIndex: index
        });
    };

    render() {
        const spacesCount = this.state.spaces.length;
        const spaceTiles = this.state.spaces.map((space, index) => {
            const isSelected = this.state.selectedSpaceIndex === index;
            const label = <p>Group {index + 1}</p>;
            const indicator = isSelected ? <b>{label}</b>: label;
            var removeButton;
            if (isSelected && space.activeRecipes.length === 0) {
                removeButton = <button onClick={() => this.removeRecipeSpace(index)}>❌</button>;
            }
            return <div className="pure-g" key={space.address} onClick={() => this.selectRecipeSpace(index)}>
                <div className="pure-u-3-4">{indicator}<p>{space.activeRecipes.length} recipes</p></div>
                <div className="pure-u-1-4 center">{removeButton}</div>
            </div>;
        });
        const selectedSpace = this.state.spaces[this.state.selectedSpaceIndex];
        const selectedSpaceDetail = this.state.spaces.length < (this.state.selectedSpaceIndex + 1) ? null :
            <RecipeSpaceDetail
                activeRecipes={selectedSpace.activeRecipes}
                recipes={this.state.recipes}
                startRecipe={(recipe, scalePercentage) => this.startRecipeInSpace(selectedSpace.address, recipe, scalePercentage)}
                removeRecipe={(recipe) => this.removeRecipeFromSpace(selectedSpace.address, recipe)}
                updateRecipeStep={(recipe, stepIndex) => this.updateRecipeStepInSpace(selectedSpace.address, recipe, stepIndex)}
                provider={this.props.provider}
                accessDeployedContract={this.props.accessDeployedContract}/>;

        const allowNewSpace = this.state.spaces.filter((space) => space.activeRecipes.length === 0).length === 0;
        const createNewSpaceButton = allowNewSpace ? <button onClick={this.createRecipeSpace}>New recipe group</button> : null;
        return <div>
            <div className="pure-g">
                <div className="pure-u-1-4">
                    {spaceTiles}
                    {createNewSpaceButton}
                </div>
                <div className="pure-u-3-4">
                    {selectedSpaceDetail}
                </div>
            </div>
        </div>;
    }
}

export default RecipePreparation;
