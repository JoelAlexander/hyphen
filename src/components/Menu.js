import React from 'react';

class Menu extends React.Component {

  render() {
    let loginLogoutButton;
    if (!this.props.loggedIn) {
      loginLogoutButton = [
        <li key="login_houseaccount" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={this.props.loginWithHouseWallet}>Use house account</a>
        </li>,
        <li key="login_walletconnect" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={this.props.loginWithWalletConnect}>Connect wallet</a>
        </li>,
        <li key="login_about" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("faq")}>FAQ</a>
        </li>
      ]
    } else {
      loginLogoutButton =
        <li key="logout" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={this.props.logout}>Logout</a>
        </li>
    }

    let loggedInMenuItems;
    if (this.props.loggedIn) {
      loggedInMenuItems = [
        <li key="faucet" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("faucet")}>Faucet</a>
        </li>,
        <li key="table" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("table")}>Table</a>
        </li>,
        <li key="recipes" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("recipes")}>Recipes</a>
        </li>,
        <li key="kitchen" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("kitchen")}>Kitchen</a>
        </li>,
        <li key="ens" className="pure-menu-item">
            <a href="#" className="pure-menu-link" onClick={() => this.props.activateApp("ens")}>ENS</a>
        </li>
      ]
    }

    return <div className="pure-menu sidebar-restricted-width" style={{paddingRight:"1em"}}>
      <span className="pure-menu-heading">Hyphen</span>
      <ul className="pure-menu-list">
        {loginLogoutButton}
        {loggedInMenuItems}
      </ul>
    </div>;
  }
}

export default Menu;