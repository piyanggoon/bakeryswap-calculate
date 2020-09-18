const currencyJs = require('currency.js');

function token(value, decimal = 18) {
  return value / Math.pow(10, decimal);
};

function currency(value, symbol = true, precision = 2) {
  symbol = (symbol ? '$' : '');
  return currencyJs(value, { symbol: symbol, precision: precision}).format();
}

module.exports = {
  token,
  currency
};
