import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';

const Counter = () => {
  const context = useContext(HyphenContext);
  const counterContract = context.getContract('counter.hyphen');
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCount = () => {
    counterContract.count().then(setCount);
  };

  const incrementListener = (address) => {
    if (context.address !== address) {
      setCount(count.add(1));
    }
  };

  useEffect(() => {
    fetchCount();
  }, [])

  useEffect(() => {
    const incrementListener = (address) => {
      if (context.address !== address) {
        setCount(count.add(1));
      }
    };

    counterContract.on('Incremented', incrementListener);
    return () => {
      counterContract.off('Incremented', incrementListener);
    };
  }, [count]);

  const handleIncrement = () => {
    setCount(count.add(1));
    counterContract.increment()
      .catch((reason) => setCount(count));
  };

  return (
    <div className="counter">
      <h1>Counter</h1>
      <p>Current count: {count === null ? 'Loading...' : count.toString()}</p>
      <button onClick={handleIncrement}>
        {loading ? 'Incrementing...' : 'Increment'}
      </button>
    </div>
  );
};

export default Counter;