
export const threeOrFewerDecimalPlaces = (number) => {
  const three = Number(number.toFixed(3));
  const two = Number(number.toFixed(2));
  const one = Number(number.toFixed(1));
  const zero = Number(number.toFixed(0));
  if (three === zero) {
    return zero;
  } else if (three === one) {
    return one;
  } else if (three === two) {
    return two;
  } else {
    return three;
  }
};

