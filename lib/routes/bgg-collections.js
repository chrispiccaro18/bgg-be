const { Router } = require('express');
const request = require('superagent');
const {
  BGG_BASE_URL,
  MIN_TO_REFRESH_COLLECTION,
  DAYS_TO_CLEAR_CACHE,
  NO_BG_TXT,
  PROCESSED_REQUEST,
} = require('../utils/constants');
const parser = require('xml2json');
const { pickUniqueRandomGame } = require('./route-utils');

let userCache = {
  cacheDate: new Date(),
};

const asyncTimeout = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = Router()
  .get('/:username', async(req, res, next) => {
    const username = req.params.username;

    // check cacheDate, if older than a day reset it
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - DAYS_TO_CLEAR_CACHE);
    if(userCache.cacheDate < oneDayAgo) {
      userCache = {
        cacheDate: new Date(),
      };
      console.log('userCache reset');
    }

    // if they are in the cache and it's not time to reset, use the cache
    if(userCache[username] && (userCache[username].timeToRefresh) > new Date()) {
      if(userCache[username].errors) {
        res.send(userCache[username].errors);
        return;
      }

      const { collection, lastRandomGame } = userCache[username];
      const randomGame = pickUniqueRandomGame(collection, lastRandomGame);
      userCache[username].lastRandomGame = randomGame;
      res.send(randomGame);
      return;
    }


    try {
      let bggResponse = await request
        .get(`${BGG_BASE_URL}/collection?username=${username}`);

      let parsedResponse = JSON.parse(parser.toJson(bggResponse.text));

      if(parsedResponse.message) {
        console.log('API MESSAGE:', parsedResponse.message);
        let isProcessedMessage = parsedResponse.message === PROCESSED_REQUEST;
        while(isProcessedMessage) {
          await asyncTimeout(500);

          bggResponse = await request
            .get(`${BGG_BASE_URL}/collection?username=${username}`);

          parsedResponse = JSON.parse(parser.toJson(bggResponse.text));
          isProcessedMessage = parsedResponse.message === PROCESSED_REQUEST;
        }
      }

      const timeToRefresh = new Date();
      timeToRefresh.setMinutes(timeToRefresh.getMinutes() + MIN_TO_REFRESH_COLLECTION);

      // ok response from API but error in what's returned
      // i.e. not a valid username
      if(parsedResponse.errors) {
        userCache[username] = {
          errors: parsedResponse.errors,
          timeToRefresh,
        };
        res.send(parsedResponse.errors);
        return;
      }

      // no boardgames in BGG collection
      if(parsedResponse.items.totalitems < 1) {
        userCache[username] = {
          errors: { error: { message: NO_BG_TXT } },
          timeToRefresh,
        };
        res.send(userCache[username].errors);
        return;
      }

      const rawListOfBGs = parsedResponse.items.item;

      const normalizedListOfBGs = rawListOfBGs.map(boardgame => ({
        name: boardgame.name.$t,
        img: boardgame.thumbnail,
      }));

      const randomGame = pickUniqueRandomGame(
        normalizedListOfBGs,
        userCache[username] ? userCache[username].lastRandomGame : null
      );

      userCache[username] = {
        collection: normalizedListOfBGs,
        timeToRefresh,
        lastRandomGame: randomGame,
      };

      res.send(randomGame);
    } catch(err) {
      console.log('UH-OH, ERROR:', err);
      // error from API
      // i.e. rate limit
      if(err.response) {
        const parsedResponseError = JSON.parse(parser.toJson(err.response.text));
        res.send(parsedResponseError);
      }
      else next(err);
    }
  });
