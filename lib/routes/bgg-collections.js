const { Router } = require('express');
const request = require('superagent');
const { BGG_BASE_URL } = require('../utils/constants');
const parser = require('xml2json');

const pickRandomGame = listOfGames => {
  const randomIndex = Math.floor(Math.random() * listOfGames.length);
  return listOfGames[randomIndex];
};

module.exports = Router()
  .get('/:username', async(req, res, next) => {
    const username = req.params.username;
    try {
      const bggResponse = await request
        .get(`${BGG_BASE_URL}/collection?username=${username}`);

      // logger for raw response from BBG
      // fs.writeFileSync('log.json', JSON.stringify(bggResponse), err => {
      //   if(err) throw err;
      // });

      const parsed = JSON.parse(parser.toJson(bggResponse.text));
      if(parsed.errors) res.send(parsed.errors);
      const rawListOfBGs = parsed.items.item;

      const normalizedListOfBGs = rawListOfBGs.map(boardgame => ({
        name: boardgame.name.$t,
        img: boardgame.image,
      }));

      res.send(pickRandomGame(normalizedListOfBGs));
    } catch(err) {
      if(err.response.text) {
        const parsed = JSON.parse(parser.toJson(err.response.text));
        res.send(parsed);
      }
      else next(err);
    }
  });
