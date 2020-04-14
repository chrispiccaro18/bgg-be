const pickRandomGame = listOfGames => {
  const randomIndex = Math.floor(Math.random() * listOfGames.length);
  return listOfGames[randomIndex];
};

const pickUniqueRandomGame = (normalizedListOfBGs, lastRandomGame) => {
  let randomGame = pickRandomGame(normalizedListOfBGs);
  if(!lastRandomGame || normalizedListOfBGs.length === 1) return randomGame;

  while(randomGame.name === lastRandomGame.name) {
    randomGame = pickRandomGame(normalizedListOfBGs);
  }
  return randomGame;
};

module.exports = {
  pickRandomGame,
  pickUniqueRandomGame,
};
