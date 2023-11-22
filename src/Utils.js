const ethers = require("ethers");

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

export const toEthAmountString = (amountWei, decimals) => {
  const decimalsToUse = decimals ? decimals : 3;
  return "" + Number(ethers.utils.formatEther(amountWei)).toFixed(decimalsToUse) + " ⟠";
};

export const stringToColor = (str) => {
  if (!str) {
    return '#000000';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

export const getContrastColor = (bgColor) => {
  const hex = bgColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'black' : 'white';
};

export const shortenHex = (raw) => raw.slice(0, 5) + "..." + raw.slice(raw.length - 3)