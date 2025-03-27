const { Collection } = require("discord.js");
const economy = require("./economySystem");

class GambleSystem {
  constructor() {
    this.games = new Collection();
    this.deck = this.createDeck();
  }

  // Simple dice game
  async playDice(userId, bet, choice) {
    const profile = await economy.getProfile(userId);
    if (profile.balance < bet)
      return { success: false, reason: "insufficient_funds" };

    await economy.addMoney(userId, -bet);

    const roll = Math.floor(Math.random() * 6) + 1;
    const won =
      (choice === "high" && roll > 3) || (choice === "low" && roll <= 3);
    const multiplier = won ? 2 : 0;
    const winAmount = Math.floor(bet * multiplier);

    // Update stats
    await economy.updateProfile(userId, {
      "stats.gamblingStats.gamesPlayed":
        profile.stats.gamblingStats.gamesPlayed + 1,
      "stats.gamblingStats.won":
        profile.stats.gamblingStats.won + (won ? 1 : 0),
      "stats.gamblingStats.lost":
        profile.stats.gamblingStats.lost + (won ? 0 : 1),
      "stats.gamblingStats.biggestWin": won
        ? Math.max(profile.stats.gamblingStats.biggestWin, winAmount)
        : profile.stats.gamblingStats.biggestWin,
      "stats.gamblingStats.biggestLoss": !won
        ? Math.max(profile.stats.gamblingStats.biggestLoss, bet)
        : profile.stats.gamblingStats.biggestLoss,
      "stats.gamblingStats.totalEarned":
        profile.stats.gamblingStats.totalEarned + (won ? winAmount : 0),
      "stats.gamblingStats.totalLost":
        profile.stats.gamblingStats.totalLost + (!won ? bet : 0),
    });

    // Update balance
    const newBalance = await economy.addMoney(userId, winAmount);

    return {
      success: true,
      won,
      roll,
      choice,
      winAmount,
      newBalance,
    };
  }

  createDeck() {
    try {
    const suits = ["♠️", "♥️", "♣️", "♦️"];
    const values = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];
    let deck = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }

    return this.shuffleDeck([...deck]);
    } catch (error) {
      console.error("Error creating deck:", error);
      return [];
    }
  }

  shuffleDeck(deck) {
    try {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
    } catch (error) {
      console.error("Error shuffling deck:", error);
      return [];
    }
  }

  getCardValue(card) {
    try {
    if (card.value === "A") return 11;
    if (["K", "Q", "J"].includes(card.value)) return 10;
    return parseInt(card.value);
    } catch (error) {
      console.error("Error getting card value:", error);
    }
  }

  calculateHand(cards) {
    try {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.value === "A") {
        aces++;
        total += 11;
      } else {
        total += this.getCardValue(card);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  } catch (error) {
    console.error("Error calculating hand:", error);
  }
}

  formatHand(cards, hideSecond = false) {
    try {
    if (hideSecond && cards.length > 1) {
      return `${cards[0].value}${cards[0].suit} | 🂠`;
    }
    return cards.map((card) => `${card.value}${card.suit}`).join(" | ");
    } catch (error) {
      console.error("Error formatting hand:", error);
    }
  }

  async startBlackjack(userId, bet) {
    try {
    const profile = await economy.getProfile(userId);
    if (profile.balance < bet)
      return { success: false, reason: "insufficient_funds" };

    await economy.addMoney(userId, -bet);

    // Create new deck if needed
    if (this.deck.length < 10) this.deck = this.createDeck();

    const playerHand = [this.deck.pop(), this.deck.pop()];
    const dealerHand = [this.deck.pop()];

    const gameState = {
      userId,
      bet,
      playerHand,
      dealerHand,
      deck: this.deck,
      status: "playing",
    };

    this.games.set(userId, gameState);

    return {
      success: true,
      playerHand,
      dealerHand,
      playerTotal: this.calculateHand(playerHand),
      dealerTotal: this.calculateHand(dealerHand),
      status: "playing",
    };
    } catch (error) {
    console.error("Error starting blackjack:", error);
    }
  }

  async hitBlackjack(userId) {
    const game = this.games.get(userId);
    if (!game) return null;

    try {
        game.playerHand.push(this.deck.pop());
        const playerTotal = this.calculateHand(game.playerHand);
        const dealerTotal = this.calculateHand(game.dealerHand);

        if (playerTotal > 21) {
            game.status = "bust";
            return await this.endBlackjack(userId);
        }

        this.games.set(userId, game);

        return {
            playerHand: game.playerHand,
            dealerHand: game.dealerHand,
            playerTotal: playerTotal,
            dealerTotal: dealerTotal,
            status: game.status
        };
    } catch (error) {
        console.error("Error in hitBlackjack:", error);
        return null;
    }
}

  async standBlackjack(userId) {
    try {
    const game = this.games.get(userId);
    if (!game) return null;

    // Dealer's turn
    while (this.calculateHand(game.dealerHand) < 17) {
      game.dealerHand.push(this.deck.pop());
    }

    return await this.endBlackjack(userId);
    } catch (error) {
        console.error("Error in standBlackjack:", error);
        return null;
    }
  }

  async endBlackjack(userId) {
    try {
    const game = this.games.get(userId);
    if (!game) return null;

    const playerTotal = this.calculateHand(game.playerHand);
    const dealerTotal = this.calculateHand(game.dealerHand);

    let multiplier = 0;
    let won = false;

    if (playerTotal > 21) {
      game.status = "bust";
    } else if (dealerTotal > 21) {
      game.status = "win";
      multiplier = 2;
      won = true;
    } else if (playerTotal > dealerTotal) {
      game.status = "win";
      multiplier = 2;
      won = true;
    } else if (playerTotal < dealerTotal) {
      game.status = "lose";
    } else {
      game.status = "push";
      multiplier = 1;
    }

    // Check for blackjack (21 with 2 cards)
    if (playerTotal === 21 && game.playerHand.length === 2) {
      game.status = "blackjack";
      multiplier = 2.5;
      won = true;
    }

    const winAmount = Math.floor(game.bet * multiplier);
    const profile = await economy.getProfile(userId);

    // Update stats
    await economy.updateProfile(userId, {
      "stats.gamblingStats.gamesPlayed":
        profile.stats.gamblingStats.gamesPlayed + 1,
      "stats.gamblingStats.won":
        profile.stats.gamblingStats.won + (won ? 1 : 0),
      "stats.gamblingStats.lost":
        profile.stats.gamblingStats.lost + (won ? 0 : 1),
      "stats.gamblingStats.biggestWin": won
        ? Math.max(profile.stats.gamblingStats.biggestWin, winAmount)
        : profile.stats.gamblingStats.biggestWin,
      "stats.gamblingStats.biggestLoss": !won
        ? Math.max(profile.stats.gamblingStats.biggestLoss, game.bet)
        : profile.stats.gamblingStats.biggestLoss,
      "stats.gamblingStats.totalEarned":
        profile.stats.gamblingStats.totalEarned + (won ? winAmount : 0),
      "stats.gamblingStats.totalLost":
        profile.stats.gamblingStats.totalLost + (!won ? game.bet : 0),
    });

    const newBalance = await economy.addMoney(userId, winAmount);

    const result = {
      playerHand: game.playerHand,
      dealerHand: game.dealerHand,
      playerTotal,
      dealerTotal,
      status: game.status,
      won,
      bet: game.bet,
      winAmount,
      newBalance,
    };

    this.games.delete(userId);
    return result;
  } catch (error) {
    console.error("Error ending blackjack:", error);
  }
}
}

module.exports = new GambleSystem();
