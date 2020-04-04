const mongoose = require('mongoose');
const state = require('mongoose/lib/connectionstate');

module.exports = (req, res, next) => {
  const { readyState } = mongoose.connection;
  if(readyState === state.connected || readyState === state.connecting) {
    next();
  } else {
    const err = new Error('Unable to connect to data base');
    err.status = 500;
    next(err);
  }
};
