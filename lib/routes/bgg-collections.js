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

const pickRandomGame = listOfGames => {
  const randomIndex = Math.floor(Math.random() * listOfGames.length);
  return listOfGames[randomIndex];
};

const uniqueRandomGame = (normalizedListOfBGs, lastRandomGame) => {
  let randomGame = pickRandomGame(normalizedListOfBGs);
  if(!lastRandomGame || normalizedListOfBGs.length === 1) return randomGame;

  while(randomGame.name === lastRandomGame.name) {
    randomGame = pickRandomGame(normalizedListOfBGs);
  }
  return randomGame;
};

let userCache = {
  cacheDate: new Date(),
};

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
      const randomGame = uniqueRandomGame(collection, lastRandomGame);
      userCache[username].lastRandomGame = randomGame;
      res.send(randomGame);
      return;
    }

    try {
      const bggResponse = await request
        .get(`${BGG_BASE_URL}/collection?username=${username}`);

      const parsedResponse = JSON.parse(parser.toJson(bggResponse.text));

      if(parsedResponse.message) {
        console.log('API MESSAGE:', parsedResponse.message);
        if(parsedResponse.message === PROCESSED_REQUEST) {
          //TODO: request again if we get the processed request message
          console.log('request again');
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

      const randomGame = uniqueRandomGame(
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
