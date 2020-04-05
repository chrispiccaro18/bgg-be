const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());

app.use(require('morgan')('tiny', {
  skip: () => process.env.NODE_ENV = 'test'
}));

app.use(express.json());

app.use('/api/v1/game', require('./routes/bgg-things'));
app.use('/api/v1/collection', require('./routes/bgg-collections'));

app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));

module.exports = app;
