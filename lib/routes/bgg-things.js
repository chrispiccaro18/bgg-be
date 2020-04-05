 
const { Router } = require('express');
const request = require('superagent');
const { BGG_BASE_URL } = require('../utils/constants');
const parser = require('xml2json');

module.exports = Router()
  .get('/:id', async(req, res, next) => {
    const id = req.params.id;
    try {
      const bggResponse = await request
        .get(`${BGG_BASE_URL}/thing?id=${id}`);

      const parsed = JSON.parse(parser.toJson(bggResponse.text));
      res.send(parsed.items.item);
    } catch(err) {
      next(err);
    }
  });
