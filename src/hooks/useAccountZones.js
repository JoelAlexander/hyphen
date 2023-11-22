import { useContext, useEffect, useState } from 'react';
import { namehash } from 'ethers/lib/utils';
import useAccountTextRecord from './useAccountTextRecord';
import useInteractiveContractState from './useInteractiveContractState';
import HyphenContext from '../context/HyphenContext';

const useAccountZones = () => {
  const context = useContext(HyphenContext);
  const resolver = context.getContract('resolver');
  const [zonesText, handleChangeZonesText] = useAccountTextRecord('zones');
  const [zones, setZones] = useState({});
  
  // Parse zones from text record
  useEffect(() => {
    try {
      const parsedZones = JSON.parse(zonesText);
      setZones(parsedZones);
    } catch (error) {
      console.error('Failed to parse zones:', error);
      setZones({});
    }
  }, [zonesText]);

  // Fetch and listen for NameChanged events
  const [zoneNames, setZoneNames] = useState({});
  Object.keys(zones).forEach(zone => {
    const node = namehash(zone);
    const [name] = useInteractiveContractState(
      resolver,
      context.getBlockNumber(),
      resolver.name(node),
      {
        NameChanged: {
          filterArgs: [node],
          digestEvent: (blockNumber, node, name) => {
            return (prevNames) => ({ ...prevNames, [node]: name });
          }
        }
      }
    );
    zoneNames[zone] = name;
  });

  // Interaction functions
  const addZone = (zone) => { /* Implementation */ };
  const changeZoneName = (zone, newName) => { /* Implementation */ };
  const disconnectFromZone = (zone) => { /* Implementation */ };

  return { zones, zoneNames, addZone, changeZoneName, disconnectFromZone };
};

export default useAccountZones;