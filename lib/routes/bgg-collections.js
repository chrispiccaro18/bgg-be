const { Router } = require('express');
const request = require('superagent');
const { BGG_BASE_URL } = require('../utils/constants');
const parser = require('xml2json');

module.exports = Router()
  .get('/:username', async(req, res, next) => {
    const username = req.params.username;
    try {
      const bggResponse = await request
        .get(`${BGG_BASE_URL}/collection?username=${username}`);

      console.log(bggResponse.statusCode);

      const parsed = JSON.parse(parser.toJson(bggResponse.text));
      const rawListOfBGs = parsed.items.item;

      const normalizedListOfBGs = rawListOfBGs.map(boardgame => ({
        name: boardgame.name.$t,
        img: boardgame.image,
      }));
      res.send(normalizedListOfBGs);
    } catch(err) {
      next(err);
    }
  });
