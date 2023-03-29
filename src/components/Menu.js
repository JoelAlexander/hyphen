import React, { useContext, useState } from 'react';
import HyphenContext from './HyphenContext';
import { slide as SlideMenu } from 'react-burger-menu';
import './menu.css';

const Menu = (props) => {
  const context = useContext(HyphenContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuClick = (callback) => {
    setMenuOpen(false);
    callback();
  };

  const accountMenuItems = !context.signer ? (
    <>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(props.loginWithHouseWallet)}>Use house account</a>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(props.loginWithWalletConnect)}>Connect wallet</a>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(props.promptForUserString)}>Login with user string</a>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(() => props.activateApp("faq"))}>FAQ</a>
    </>
  ) : (
    <>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(props.logout)}>Logout</a>
    </>
  );

  const loggedInMenuItems = context.signer && (
    <>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(() => props.activateApp("recipes"))}>Recipes</a>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(() => props.activateApp("kitchen"))}>Kitchen</a>
      <a href="#" className="pure-menu-link" onClick={() => handleMenuClick(() => props.activateApp("account"))}>Account</a>
    </>
  );

  return (
    <SlideMenu
      isOpen={menuOpen}
      onStateChange={({ isOpen }) => setMenuOpen(isOpen)}>
      {loggedInMenuItems}
      {accountMenuItems}
    </SlideMenu>
  );
};

export default Menu;
