const BaseGame = require('./baseGame');
const economy = require('../economySystem');
const shop = require('../shopSystem');

class Blackjack extends BaseGame {
    constructor() {
        super();
        this.name = '🃏 Blackjack';
        this.description = 'เกมไพ่ 21 แต้ม';
        this.minBet = 100;
        // this.maxBet = 50000;
        this.cooldown = 5000; // Set Blackjack specific cooldown
        this.games = new Map();
    }

    initializeDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];

        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }

        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    calculateHand(cards) {
        let sum = 0;
        let aces = 0;

        for (const card of cards) {
            if (card.value === 'A') {
                aces++;
                sum += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                sum += 10;
            } else {
                sum += parseInt(card.value);
            }
        }

        while (sum > 21 && aces > 0) {
            sum -= 10;
            aces--;
        }

        return sum;
    }

    async validate(userId, bet) {
        const profile = await economy.getProfile(userId);
        if (!profile) return { valid: false, reason: 'no_profile' };
        if (profile.balance < bet) return { valid: false, reason: 'insufficient_funds' };
        if (bet < this.minBet) return { valid: false, reason: 'bet_too_low' };
        if (bet > this.maxBet) return { valid: false, reason: 'bet_too_high' };
        
        const cooldown = await this.checkCooldown(userId);
        if (cooldown > 0) return { valid: false, reason: 'cooldown' };

        return { valid: true };
    }

    async play(userId, bet) {
        const deck = this.initializeDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        
        // Store game state
        this.games.set(userId, {
            deck,
            playerHand,
            dealerHand,
            bet,
            status: 'playing'
        });

        // Check for natural blackjack
        const playerTotal = this.calculateHand(playerHand);
        if (playerTotal === 21) {
            return this.endGame(userId, 'blackjack');
        }

        return {
            success: true,
            playerHand,
            dealerHand: [dealerHand[0], { hidden: true }],
            playerTotal,
            dealerTotal: this.calculateHand([dealerHand[0]]),
            status: 'playing'
        };
    }

    async hit(userId) {
        const game = this.games.get(userId);
        if (!game) return null;

        game.playerHand.push(game.deck.pop());
        const playerTotal = this.calculateHand(game.playerHand);

        if (playerTotal > 21) {
            return this.endGame(userId, 'bust');
        }

        return {
            success: true,
            playerHand: game.playerHand,
            dealerHand: [game.dealerHand[0], { hidden: true }],
            playerTotal,
            dealerTotal: this.calculateHand([game.dealerHand[0]]),
            status: 'playing'
        };
    }

    async stand(userId) {
        const game = this.games.get(userId);
        if (!game) return null;

        let dealerTotal = this.calculateHand(game.dealerHand);
        while (dealerTotal < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerTotal = this.calculateHand(game.dealerHand);
        }

        const playerTotal = this.calculateHand(game.playerHand);

        let status;
        if (dealerTotal > 21) {
            status = 'win';
        } else if (dealerTotal === playerTotal) {
            status = 'push';
        } else if (dealerTotal > playerTotal) {
            status = 'lose';
        } else {
            status = 'win';
        }

        return this.endGame(userId, status);
    }

    async endGame(userId, status) {
        const game = this.games.get(userId);
        if (!game) return null;

        let multiplier = 0;
        switch (status) {
            case 'blackjack': multiplier = 2.3; break;
            case 'win': multiplier = 1.9; break;
            case 'push': multiplier = 1; break;
            default: multiplier = 0;
        }

        const winAmount = Math.floor(game.bet * multiplier);
        const newBalance = await economy.addMoney(userId, winAmount - game.bet);

        // Update stats
        const profile = await economy.getProfile(userId);
        await economy.updateProfile(userId, {
            "stats.gamblingStats.gamesPlayed": profile.stats.gamblingStats.gamesPlayed + 1,
            "stats.gamblingStats.won": profile.stats.gamblingStats.won + (winAmount > game.bet ? 1 : 0),
            "stats.gamblingStats.lost": profile.stats.gamblingStats.lost + (winAmount < game.bet ? 1 : 0),
            "stats.gamblingStats.biggestWin": Math.max(profile.stats.gamblingStats.biggestWin, winAmount - game.bet),
            "stats.gamblingStats.totalWagered": profile.stats.gamblingStats.totalWagered + game.bet
        });

        // Set cooldown
        await this.setCooldown(userId);

        const result = {
            success: true,
            playerHand: game.playerHand,
            dealerHand: game.dealerHand,
            playerTotal: this.calculateHand(game.playerHand),
            dealerTotal: this.calculateHand(game.dealerHand),
            status,
            bet: game.bet,
            winAmount,
            newBalance
        };

        this.games.delete(userId);
        return result;
    }
}

module.exports = new Blackjack();