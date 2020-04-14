const {
  pickUniqueRandomGame,
} = require('../../lib/routes/route-utils');

describe('Route Utils', () => {
  it('choose unique random item from array', () => {
    const lastGame = { name: 'game1' };
    const list = [
      lastGame,
      {
        name: 'game2',
      },
    ];

    const uniqueRandomGame = pickUniqueRandomGame(list, lastGame);
    expect(uniqueRandomGame.name).toBe('game2');
  });
});
