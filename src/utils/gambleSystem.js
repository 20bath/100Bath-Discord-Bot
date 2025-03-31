const blackjack = require('./gambleGame/blackjack');
const crash = require('./gambleGame/crashGame');
const roulette = require('./gambleGame/roulette');
class GambleSystem {
    constructor() {
        this.games = {
            blackjack: blackjack,
            crash: crash,
            roulette: roulette
        };
    }

    getGame(gameType) {
        return this.games[gameType];
    }

    async playGame(gameType, userId, bet, choice) {
        const game = this.getGame(gameType);
        if (!game) {
            return { success: false, reason: 'invalid_game' };
        }

        const validation = await game.validate(userId, bet);
        if (!validation.valid) {
            return { success: false, reason: validation.reason };
        }

        return await game.play(userId, bet, choice);
    }
}

module.exports = new GambleSystem();