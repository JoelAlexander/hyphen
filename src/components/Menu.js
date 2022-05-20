import React from 'react';
import { slide as SlideMenu } from 'react-burger-menu'

var styles = {
  bmBurgerButton: {
    position: 'fixed',
    width: '36px',
    height: '30px',
    left: '36px',
    top: '36px'
  },
  bmBurgerBars: {
    background: '#373a47'
  },
  bmBurgerBarsHover: {
    background: '#a90000'
  },
  bmCrossButton: {
    height: '24px',
    width: '24px'
  },
  bmCross: {
    background: '#bdc3c7'
  },
  bmMenuWrap: {
    position: 'fixed',
    height: '100%'
  },
  bmMenu: {
    background: '#373a47',
    padding: '2.5em 1.5em 0',
    fontSize: '1.15em'
  },
  bmMorphShape: {
    fill: '#373a47'
  },
  bmItemList: {
    color: '#b8b7ad',
    padding: '0.8em'
  },
  bmItem: {
    display: 'inline-block'
  },
  bmOverlay: {
    background: 'rgba(0, 0, 0, 0.3)'
  }
};

class Menu extends React.Component {

  render() {
    let loginLogoutButton;
    if (!this.props.loggedIn) {
      loginLogoutButton = [
        <a key="login_houseaccount" href="#" className="pure-menu-link" onClick={this.props.loginWithHouseWallet}>Use house account</a>,
        <a key="login_walletconnect" href="#" className="pure-menu-link" onClick={this.props.loginWithWalletConnect}>Connect wallet</a>,
        <a key="login_about" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("faq")}>FAQ</a>
      ]
    } else {
      loginLogoutButton = <a key="logout" href="#" className="pure-menu-link" onClick={this.props.logout}>Logout</a>
    }

    let loggedInMenuItems;
    if (this.props.loggedIn) {
      loggedInMenuItems = [
        <a key="table" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("table")}>Table</a>,
        <a key="recipes" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("recipes")}>Recipes</a>,
        <a key="kitchen" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("kitchen")}>Kitchen</a>,
        <a key="ens" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("ens")}>ENS</a>,
        <a key="account" href="#" className="pure-menu-link" onClick={() => this.props.activateApp("account")}>Account</a>
      ]
    }

    return <SlideMenu styles={styles}>
      {loginLogoutButton}
      {loggedInMenuItems}
    </SlideMenu>;

    // return <div className="pure-menu sidebar-restricted-width" style={{paddingRight:"1em"}}>
    //   <span className="pure-menu-heading">Hyphen</span>
    //   <ul className="pure-menu-list">
    //     {loginLogoutButton}
    //     {loggedInMenuItems}
    //   </ul>
    // </div>;
  }
}

export default Menu;