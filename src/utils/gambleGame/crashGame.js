const BaseGame = require('./baseGame');
const economy = require('../economySystem');

class CrashGame extends BaseGame {
    constructor() {
        super();
        this.name = 'crash';
        this.description = 'เกมเดิมพันที่ต้องกดถอนเงินก่อนที่จะระเบิด';
        this.minBet = 100;
        // this.maxBet = 5000;
        this.cooldown = 10000;
        this.activeGames = new Map();
    }

    async validate(userId, bet) {
        const profile = await economy.getProfile(userId);
        if (!profile) return { valid: false, reason: 'no_profile' };
        if (profile.balance < bet) return { valid: false, reason: 'insufficient_funds' };
        if (bet < this.minBet) return { valid: false, reason: 'bet_too_low' };
        if (bet > this.maxBet) return { valid: false, reason: 'bet_too_high' };
        
        // Check if user already has an active game
        if (this.activeGames.has(userId)) {
            return { valid: false, reason: 'active_game' };
        }

        const cooldown = await this.checkCooldown(userId);
        if (cooldown > 0) return { valid: false, reason: 'cooldown' };

        return { valid: true };
    }

    async play(userId, bet) {
        await economy.addMoney(userId, -bet);
        
        const gameSession = {
            bet,
            currentMultiplier: 1.0,
            crashPoint: this.generateCrashPoint(),
            isActive: true,
            startTime: Date.now()
        };

        this.activeGames.set(userId, gameSession);
        await this.setCooldown(userId);

        return {
            success: true,
            currentMultiplier: gameSession.currentMultiplier,
            bet
        };
    }

    async continueGame(userId) {
        const game = this.activeGames.get(userId);
        if (!game || !game.isActive) {
            return { 
                success: false, 
                reason: 'no_active_game',
                currentMultiplier: 1.0
            };
        }

        // Increase multiplier
        game.currentMultiplier = Math.min(
            game.currentMultiplier + 0.2,
            10.0 // Maximum multiplier
        );

        // Check if crashed
        if (game.currentMultiplier >= game.crashPoint) {
            this.activeGames.delete(userId);
            return {
                success: false,
                reason: 'crashed',
                crashPoint: game.crashPoint,
                currentMultiplier: game.currentMultiplier,
                bet: game.bet
            };
        }

        return {
            success: true,
            currentMultiplier: game.currentMultiplier,
            potentialWin: Math.floor(game.bet * game.currentMultiplier)
        };
    }

    async cashout(userId) {
        const game = this.activeGames.get(userId);
        if (!game || !game.isActive) {
            return { success: false, reason: 'no_active_game' };
        }

        // Calculate winnings
        const winAmount = Math.floor(game.bet * game.currentMultiplier);
        await economy.addMoney(userId, winAmount);

        // Update stats
        const profile = await economy.getProfile(userId);
        await economy.updateProfile(userId, {
            "stats.gamblingStats.gamesPlayed": profile.stats.gamblingStats.gamesPlayed + 1,
            "stats.gamblingStats.won": profile.stats.gamblingStats.won + 1,
            "stats.gamblingStats.biggestWin": Math.max(profile.stats.gamblingStats.biggestWin, winAmount - game.bet),
            "stats.gamblingStats.totalWagered": profile.stats.gamblingStats.totalWagered + game.bet
        });

        this.activeGames.delete(userId);
        return {
            success: true,
            multiplier: game.currentMultiplier,
            winAmount,
            bet: game.bet
        };
    }

    generateCrashPoint() {
        // Using a house edge of 3%
        const houseEdge = 0.97;
        const random = Math.random();
        return Math.max(1.0, Math.floor((100 / (random * 100) * houseEdge) * 100) / 100);
    }

    getGameState(userId) {
        return this.activeGames.get(userId) || null;
    }
}

module.exports = new CrashGame();