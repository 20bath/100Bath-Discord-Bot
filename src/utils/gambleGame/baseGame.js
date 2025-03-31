const economy = require('../economySystem');

class BaseGame {
    constructor() {
        this.name = 'Base Game';
        this.description = 'Base game description';
        this.minBet = 100;
        this.maxBet = 50000;
        this.cooldown = 5000; // Default 5 seconds cooldown
    }

    async checkCooldown(userId) {
        return await economy.checkCooldownCache(userId, `gamble_${this.name}`);
    }

    async setCooldown(userId) {
        return await economy.setCooldownCache(userId, `gamble_${this.name}`, this.cooldown);
    }

    async validate(userId, bet) {
        return { valid: true };
    }

    async play(userId, bet, choice) {
        throw new Error('play() method must be implemented');
    }
}

module.exports = BaseGame;