import React, { useState, useEffect, useContext } from 'react';
import HyphenContext from './HyphenContext';

const Counter = () => {
  const context = useContext(HyphenContext);
  const counterContract = context.getContract('counter.hyphen');
  const [count, setCount] = useState(null);

  const fetchCount = () => {
    counterContract.count().then(setCount);
  };

  useEffect(() => {
    fetchCount();
  }, [])

  useEffect(() => {
    const incrementListener = (address) => {
      if (context.address !== address) {
        setCount(prevCount => {
          if (prevCount) {
            return prevCount.add(1);
          }
        });
      }
    };

    const filter = counterContract.filters.Incremented(null);
    counterContract.on(filter, incrementListener);
    return () => {
      counterContract.off(filter, incrementListener);
    };
  }, []);

  const handleIncrement = () => {
    const newCount = count.add(1);
    setCount(newCount);
    context.addActivityToast(context.address, `${newCount}`);
    counterContract.increment()
      .catch((reason) => {
        console.error(`Exception during increment: ${reason}, resetting count to ${count}`)
        setCount(count);
      });
  };

  return (
    <div className="counter">
      <h1>Counter</h1>
      <p>Current count: {count === null ? 'Loading...' : count.toString()}</p>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
};

export default Counter;