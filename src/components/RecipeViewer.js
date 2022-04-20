import React from 'react';
import { threeOrFewerDecimalPlaces } from '../Utils';
const ethers = require("ethers");

class RecipeViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.recipe != this.props.recipe) {
      this.update();
    }
  }

  update = () => {
    if (this.props.recipe && this.props.recipe.author) {
      this.props.provider.lookupAddress(this.props.recipe.author).then((authorName) => {
        this.setState({
          authorName: authorName
        })
      })
    }
  };

  render() {
    const ingredients =
      this.props.recipe &&
      this.props.recipe.ingredients &&
      this.props.recipe.ingredients.map(([name, unit, amount], index) => {
        const amountString = amount > 0 ? threeOrFewerDecimalPlaces(amount / 1000).toString() + " " + unit : "As needed";
        return <div key={this.props.recipe.name + "i" + index} className="pure-g">
          <div className="pure-u-1-3">{name}</div>
          <div className="pure-u-1-3">{amountString}</div>
          <div className="pure-u-1-3"></div>
        </div>;
      });
    const steps =
      this.props.recipe &&
      this.props.recipe.steps &&
      this.props.recipe.steps.map((step, index) => {
        return <p key={this.props.recipe.name + "s" + index}>{(index + 1).toString() + ". " + step}</p>;
      });
    var ingredientsSection;
    if (ingredients && ingredients.length > 0) {
      ingredientsSection = <div>
        <h4>Ingredients</h4>
        {ingredients}
      </div>;
    }
    var stepsSection;
    if (steps && steps.length > 0) {
      stepsSection = <div>
        <h4>Steps</h4>
        {steps}
      </div>;
    }
    var editButton;
    var deleteButton;
    var authorship;
    if (this.props.recipe && this.props.recipe.author) {
      authorship = <h4>Authored by {this.state.authorName || this.props.recipe.author}</h4>;
      editButton = <button onClick={() => this.props.startEditing(this.props.recipe)}>Edit</button>
      deleteButton = <button onClick={() => this.props.removeRecipe(this.props.recipe.recipe)}>Delete</button>;
    }
    return <div style={{marginTop: "2em"}}>
      <div className="pure-g">
        <div className="pure-u-2-3">
          <h3>{this.props.recipe && this.props.recipe.name}</h3>
          {authorship}
        </div>
        <div className="pure-u-1-3">
          {editButton}
          {deleteButton}
        </div>
      </div>
      {ingredientsSection}
      {stepsSection}
    </div>;
  }
}

export default RecipeViewer;