import React, { useState, useEffect } from 'react';
import { openDB } from 'idb';

const useLocalSettings = () => {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    openDB('AppSettings', 1, {
      upgrade(db) {
        db.createObjectStore('accounts');
      },
    }).then(db => {
      return db.getAll('accounts');
    }).then(allAccounts => {
      setAccounts(allAccounts);
    });
  }, []);

  const addAccount = async (newFingerprint) => {
    const newAccount = {
      fingerprint: newFingerprint,
      networks: [],
      zones: [],
    };
    await openDB('AppSettings', 1).then((db) => {
      return db.add('accounts', newAccount, newFingerprint);
    });
    setAccounts([...accounts, newAccount]);
  };

  const removeAccount = async (fingerprint) => {
    await openDB('AppSettings', 1).then((db) => {
      return db.delete('accounts', fingerprint);
    });
    setAccounts(accounts.filter(account => account.fingerprint !== fingerprint));
  };

  const updateAccountOrder = async (fingerprint, newPosition) => {
    const account = accounts.find(acc => acc.fingerprint === fingerprint);
    const newAccounts = accounts.filter(acc => acc.fingerprint !== fingerprint);
    newAccounts.splice(newPosition, 0, account);
    await openDB('AppSettings', 1).then((db) => {
      newAccounts.forEach((acc, index) => {
        db.put('accounts', acc, acc.fingerprint);
      });
    });
    setAccounts(newAccounts);
  };

  const updateNetworkOrder = async (fingerprint, network, newPosition) => {
    const accountIndex = accounts.findIndex(acc => acc.fingerprint === fingerprint);
    if (accountIndex !== -1) {
      const newNetworks = [...accounts[accountIndex].networks];
      newNetworks.splice(newNetworks.indexOf(network), 1);
      newNetworks.splice(newPosition, 0, network);
  
      await modifyNetworks(fingerprint, newNetworks);
    }
  };
  
  const updateZoneOrder = async (fingerprint, zone, newPosition) => {
    const accountIndex = accounts.findIndex(acc => acc.fingerprint === fingerprint);
    if (accountIndex !== -1) {
      const newZones = [...accounts[accountIndex].zones];
      newZones.splice(newZones.indexOf(zone), 1);
      newZones.splice(newPosition, 0, zone);
  
      await modifyZones(fingerprint, newZones);
    }
  };

  const modifyNetworks = async (fingerprint, networks) => {
    const accountIndex = accounts.findIndex(acc => acc.fingerprint === fingerprint);
    if(accountIndex !== -1) {
      const updatedAccount = {...accounts[accountIndex], networks};
      await openDB('AppSettings', 1).then((db) => {
        return db.put('accounts', updatedAccount, fingerprint);
      });
      const newAccounts = [...accounts];
      newAccounts[accountIndex] = updatedAccount;
      setAccounts(newAccounts);
    }
  };

  const modifyZones = async (fingerprint, zones) => {
    const accountIndex = accounts.findIndex(acc => acc.fingerprint === fingerprint);
    if(accountIndex !== -1) {
      const updatedAccount = {...accounts[accountIndex], zones};
      await openDB('AppSettings', 1).then((db) => {
        return db.put('accounts', updatedAccount, fingerprint);
      });
      const newAccounts = [...accounts];
      newAccounts[accountIndex] = updatedAccount;
      setAccounts(newAccounts);
    }
  };

  const addNetworkOrZone = (modifyFunction) => (fingerprint, item) => {
    const account = accounts.find(acc => acc.fingerprint === fingerprint);
    if (account) {
      const items = [...account[modifyFunction === modifyNetworks ? 'networks' : 'zones'], item];
      modifyFunction(fingerprint, items);
    }
  };

  return {
    accounts,
    addAccount,
    removeAccount,
    updateAccountOrder,
    updateNetworkOrder,
    updateZoneOrder,
    addNetwork: addNetworkOrZone(modifyNetworks),
    removeNetwork: (fingerprint, networkToRemove) => {
      const networks = accounts.find(acc => acc.fingerprint === fingerprint)?.networks.filter(n => n !== networkToRemove) || [];
      modifyNetworks(fingerprint, networks);
    },
    addZone: addNetworkOrZone(modifyZones),
    removeZone: (fingerprint, zoneToRemove) => {
      const zones = accounts.find(acc => acc.fingerprint === fingerprint)?.zones.filter(z => z !== zoneToRemove) || [];
      modifyZones(fingerprint, zones);
    },
  };
};

export default useLocalSettings;
