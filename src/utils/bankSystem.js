const { Collection } = require("discord.js");
const { db } = require("../config/firebase");
const economy = require("./economySystem");
const levelSystem = require("./levelSystem");
const shop = require("./shopSystem"); // เพิ่ม import shop

class BankSystem {
    constructor() {
        this.INTEREST_CONFIG = {
            RATE: 0.01, // 1% interest rate
            INTERVAL: 3600000, // 1 hour in milliseconds
            MIN_BALANCE: 1000, // minimum balance to earn interest
            MAX_INTEREST: 100000, // maximum interest per payout
        };
    }

    async calculateBankLimit(userId) {
        try {
            const baseLimit = 10000;
            const level = await levelSystem.getLevel(userId);
            const bonusLimit = level * 1000;

            // เพิ่มการเช็คไอเทมที่เพิ่มวงเงิน
            const effects = await shop.checkEffects(userId);
            const bankLimitBonus = effects.bank_balance || 0;

            const newLimit = baseLimit + bonusLimit + bankLimitBonus;

            await db.collection('economy').doc(userId).update({
                bankLimit: newLimit
            });

            return newLimit;
        } catch (error) {
            console.error("Error calculating bank limit:", error);
            return 10000;
        }
    }

    async deposit(userId, amount) {
        const profile = await economy.getProfile(userId);
        if (!profile) return { success: false, reason: "no_profile" };

        if (profile.balance < amount) {
            return { success: false, reason: "insufficient_funds" };
        }

        // คำนวณวงเงินใหม่ทุกครั้งที่มีการฝาก
        const currentBankLimit = await this.calculateBankLimit(userId);
        if (profile.bankBalance + amount > currentBankLimit) {
            return { 
                success: false, 
                reason: "bank_limit", 
                currentLimit: currentBankLimit,
                currentBalance: profile.bankBalance,
                remainingSpace: currentBankLimit - profile.bankBalance 
            };
        }

        await economy.addMoney(userId, -amount);
        await economy.updateProfile(userId, {
            bankBalance: profile.bankBalance + amount,
            "stats.bankStats.totalDeposits": profile.stats.bankStats.totalDeposits + amount,
            "stats.bankStats.largestDeposit": Math.max(profile.stats.bankStats.largestDeposit, amount)
        });

        return {
            success: true,
            newBalance: profile.balance - amount,
            newBankBalance: profile.bankBalance + amount,
            bankLimit: currentBankLimit
        };
    }

    async withdraw(userId, amount) {
        try {
            const profile = await economy.getProfile(userId);
            if (!profile) return { success: false, reason: "no_profile" };

            if (profile.bankBalance < amount) {
                return { success: false, reason: "insufficient_funds" };
            }

            await economy.updateProfile(userId, {
                bankBalance: profile.bankBalance - amount,
                "stats.bankStats.totalWithdraws": profile.stats.bankStats.totalWithdraws + amount,
                "stats.bankStats.largestWithdraw": Math.max(profile.stats.bankStats.largestWithdraw, amount)
            });

            const newBalance = await economy.addMoney(userId, amount);

            return {
                success: true,
                newBalance,
                newBankBalance: profile.bankBalance - amount
            };
        } catch (error) {
            console.error("Error in withdraw:", error);
            return { success: false, reason: "system_error" };
        }
    }

    async processInterest(userId) {
        try {
            const profile = await economy.getProfile(userId);
            if (!profile) return null;

            const lastInterest = profile.lastInterestPaid || 0;
            const now = Date.now();

            if (now - lastInterest < this.INTEREST_CONFIG.INTERVAL) {
                return {
                    success: true,
                    timeRemaining: this.INTEREST_CONFIG.INTERVAL - (now - lastInterest),
                    nextPayout: lastInterest + this.INTEREST_CONFIG.INTERVAL
                };
            }

            if (profile.bankBalance < this.INTEREST_CONFIG.MIN_BALANCE) {
                return {
                    success: false,
                    reason: "insufficient_balance",
                    minimumRequired: this.INTEREST_CONFIG.MIN_BALANCE
                };
            }

            const interest = Math.floor(profile.bankBalance * this.INTEREST_CONFIG.RATE);
            const cappedInterest = Math.min(interest, this.INTEREST_CONFIG.MAX_INTEREST);

            await economy.updateProfile(userId, {
                bankBalance: profile.bankBalance + cappedInterest,
                lastInterestPaid: now,
                "stats.bankStats.totalInterestEarned": (profile.stats.bankStats.totalInterestEarned || 0) + cappedInterest
            });

            return {
                success: true,
                amount: cappedInterest,
                newBalance: profile.bankBalance + cappedInterest,
                nextPayout: now + this.INTEREST_CONFIG.INTERVAL
            };
        } catch (error) {
            console.error("Error processing interest:", error);
            return { success: false, reason: "system_error" };
        }
    }
}

module.exports = new BankSystem();