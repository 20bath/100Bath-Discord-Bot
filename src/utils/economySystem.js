const { Collection } = require("discord.js");
const { db } = require("../config/firebase");
levelSystem = require("./levelSystem");

class EconomySystem {
  constructor() {
    this.cooldowns = new Collection();
    this.INTEREST_CONFIG = {
      RATE: 0.01, // 1% interest rate
      INTERVAL: 3600000, // 1 hour in milliseconds
      MIN_BALANCE: 1000, // minimum balance to earn interest
      MAX_INTEREST: 100000, // maximum interest per payout
    };
  }

  async getProfile(userId) {
    try {
      const doc = await db.collection("economy").doc(userId).get();
      if (!doc.exists) {
        return this.createProfile(userId);
      }

      const profile = doc.data();

      return profile;
    } catch (error) {
      console.error("Error getting profile:", error);
      return null;
    }
  }

  async createProfile(userId) {
    const profile = {
      userId,
      balance: 0,
      bankBalance: 1000, // เพิ่มยอดเงินในธนาคาร
      bankLimit: 10000, // เพิ่มลิมิตเงินในธนาคาร
      dailyGemsEarned: 0,
      lastGemReset: null,
      gems: {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      },
      gachaStats: {
        totalPulls: 0,
        pityCount: {
          SSR: 0,
          SR: 0,
        },
        obtained: {
          SSR: 0,
          SR: 0,
          R: 0,
          N: 0,
        },
      },
      stats: {
        totalEarned: 0,
        totalLost: 0,
        workStats: {
          totalWorked: 0,
          jobsCompleted: 0,
          lastPaycheck: 0,
        },
        bankStats: {
          totalDeposits: 0,
          totalWithdraws: 0,
          largestDeposit: 0,
          largestWithdraw: 0,
        },
        gamblingStats: {
          gamesPlayed: 0,
          won: 0,
          lost: 0,
          biggestWin: 0,
          biggestLoss: 0,
          totalEarned: 0,
          totalLost: 0,
        },
        asRobber: {
          attempts: 0,
          successful: 0,
          failed: 0,
          blocked: 0,
          totalStolen: 0,
          highestStolen: 0,
          totalFines: 0,
        },
        asVictim: {
          timesTargeted: 0,
          timesRobbed: 0,
          timesSaved: 0,
          totalLost: 0,
          highestLost: 0,
        },
        asDefender: {
          blocksAttempted: 0,
          blocksSuccessful: 0,
          peopleSaved: 0,
          moneySaved: 0,
        },
        transferStats: {
          sent: {
            total: 0,
            count: 0,
            largest: 0,
            fees: 0,
          },
          received: {
            total: 0,
            count: 0,
            largest: 0,
          },
        },
      },
      robStats: {
        asRobber: {
          attempts: 0,
          successful: 0,
          failed: 0,
          blocked: 0,
          totalStolen: 0,
          highestStolen: 0,
          totalFines: 0,
        },
        asVictim: {
          timesTargeted: 0,
          timesRobbed: 0,
          timesSaved: 0,
          totalLost: 0,
          highestLost: 0,
        },
        asDefender: {
          blocksAttempted: 0,
          blocksSuccessful: 0,
          peopleSaved: 0,
          moneySaved: 0,
        },
      },
      inventory: [],
      lastDaily: 0,
      createdAt: Date.now(),
    };

    await db.collection("economy").doc(userId).set(profile);
    return profile;
  }

  async updateProfile(userId, data) {
    try {
      await db.collection("economy").doc(userId).update(data);

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  }

  async addMoney(userId, amount) {
    const profile = await this.getProfile(userId);
    if (!profile) return false;

    const newBalance = profile.balance + amount;
    await this.updateProfile(userId, {
      balance: newBalance,
      "stats.totalEarned":
        profile.stats.totalEarned + (amount > 0 ? amount : 0),
      "stats.totalLost": profile.stats.totalLost + (amount < 0 ? -amount : 0),
    });

    return newBalance;
  }

  async checkCooldownCache(userId, command) {
    try {
      const key = `${userId}_${command}`;
      const cooldown = this.cooldowns.get(key);

      if (!cooldown || Date.now() >= cooldown) {
        return 0;
      }

      return cooldown - Date.now();
    } catch (error) {
      console.error("Error checking cache cooldown:", error);
      return 0;
    }
  }

  async setCooldownCache(userId, command, time) {
    try {
      const key = `${userId}_${command}`;
      const cooldownTime = Date.now() + time;
      this.cooldowns.set(key, cooldownTime);
      return true;
    } catch (error) {
      console.error("Error setting cache cooldown:", error);
      return false;
    }
  }

  // Add new methods for cooldown handling
  async checkCooldown(userId, command) {
    try {
      const doc = await db.collection("cooldowns").doc(userId).get();
      if (!doc.exists) return 0;

      const data = doc.data();
      const cooldown = data[command];

      if (!cooldown || Date.now() >= cooldown) {
        return 0;
      }

      return cooldown - Date.now();
    } catch (error) {
      console.error("Error checking cooldown:", error);
      return 0;
    }
  }

  async setCooldown(userId, command, time) {
    try {
      const cooldownTime = Date.now() + time;

      // Get existing cooldowns
      const doc = await db.collection("cooldowns").doc(userId).get();

      if (!doc.exists) {
        // Create new cooldown document
        await db
          .collection("cooldowns")
          .doc(userId)
          .set({
            [command]: cooldownTime,
          });
      } else {
        // Update existing cooldown
        await db
          .collection("cooldowns")
          .doc(userId)
          .update({
            [command]: cooldownTime,
          });
      }

      return true;
    } catch (error) {
      console.error("Error setting cooldown:", error);
      return false;
    }
  }

  async clearExpiredCooldowns() {
    try {
      const snapshot = await db.collection("cooldowns").get();
      const batch = db.batch();
      const now = Date.now();

      snapshot.docs.forEach((doc) => {
        const cooldowns = doc.data();
        const updatedCooldowns = {};
        let hasChanges = false;

        // Keep only active cooldowns
        Object.entries(cooldowns).forEach(([command, time]) => {
          if (time > now) {
            updatedCooldowns[command] = time;
          } else {
            hasChanges = true;
          }
        });

        if (hasChanges) {
          if (Object.keys(updatedCooldowns).length === 0) {
            // Delete document if no active cooldowns
            batch.delete(doc.ref);
          } else {
            // Update with only active cooldowns
            batch.set(doc.ref, updatedCooldowns);
          }
        }
      });

      await batch.commit();
    } catch (error) {
      console.error("Error clearing expired cooldowns:", error);
    }
  }
}

module.exports = new EconomySystem();
