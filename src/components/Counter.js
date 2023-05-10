import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';

const Counter = () => {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const context = useContext(HyphenContext);
  const counterContract = context.getContract('counter.hyphen');

  const fetchCount = () => {
    counterContract.count().then(setCount);
  }

  useEffect(() => {
    fetchCount();
  }, []);

  const handleIncrement = () => {
    counterContract.increment().then(fetchCount);
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