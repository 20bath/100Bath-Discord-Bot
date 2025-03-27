const { Collection } = require('discord.js');
const { db } = require('../config/firebase');
levelSystem = require('./levelSystem');

class EconomySystem {
    constructor() {
        this.cooldowns = new Collection();
        this.INTEREST_CONFIG = {
            RATE: 0.01, // 1% interest rate
            INTERVAL: 3600000, // 1 hour in milliseconds
            MIN_BALANCE: 1000, // minimum balance to earn interest
            MAX_INTEREST: 10000 // maximum interest per payout
        };
    }

    async getProfile(userId) {
        try {
            const doc = await db.collection('economy').doc(userId).get();
            if (!doc.exists) {
                return this.createProfile(userId);
            }

            const profile = doc.data();

            return profile;
        } catch (error) {
            console.error('Error getting profile:', error);
            return null;
        }
    }

    async createProfile(userId) {
        const profile = {
            userId,
            balance: 0,
            bankBalance: 1000, // เพิ่มยอดเงินในธนาคาร
            bankLimit: 10000, // เพิ่มลิมิตเงินในธนาคาร
            stats: {
                totalEarned: 0,
                totalLost: 0,
                workStats: {
                    totalWorked: 0,
                    jobsCompleted: 0,
                    lastPaycheck: 0
                },
                bankStats: {
                    totalDeposits: 0,
                    totalWithdraws: 0,
                    largestDeposit: 0,
                    largestWithdraw: 0
                },
                gamblingStats: {
                    gamesPlayed: 0,
                    won: 0,
                    lost: 0,
                    biggestWin: 0,
                    biggestLoss: 0,
                    totalEarned: 0,
                    totalLost: 0
                },
                transferStats: {
                    sent: {
                        total: 0,
                        count: 0,
                        largest: 0,
                        fees: 0
                    },
                    received: {
                        total: 0,
                        count: 0,
                        largest: 0
                    }
                }
            },
            inventory: [],
            lastDaily: 0,
            createdAt: Date.now()
        };

        await db.collection('economy').doc(userId).set(profile);
        return profile;
    }

    async updateProfile(userId, data) {
        try {
            await db.collection('economy').doc(userId).update(data);

            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }

    async addMoney(userId, amount) {
        const profile = await this.getProfile(userId);
        if (!profile) return false;

        const newBalance = profile.balance + amount;
        await this.updateProfile(userId, {
            balance: newBalance,
            'stats.totalEarned': profile.stats.totalEarned + (amount > 0 ? amount : 0),
            'stats.totalLost': profile.stats.totalLost + (amount < 0 ? -amount : 0)
        });

        return newBalance;
    }










    

    async deposit(userId, amount) {
        const profile = await this.getProfile(userId);
        if (!profile) return { success: false, reason: 'no_profile' };
        
        if (profile.balance < amount) {
            return { success: false, reason: 'insufficient_funds' };
        }

        const currentBankLimit = await this.calculateBankLimit(userId);

        if (profile.bankBalance + amount > profile.bankLimit) {
            return { success: false, reason: 'bank_limit' };
        }

        // หักเงินจากกระเป๋า
        await this.addMoney(userId, -amount);

        // เพิ่มเงินในธนาคาร
        await this.updateProfile(userId, {
            bankBalance: profile.bankBalance + amount,
            'stats.bankStats.totalDeposits': profile.stats.bankStats.totalDeposits + amount,
            'stats.bankStats.largestDeposit': Math.max(profile.stats.bankStats.largestDeposit, amount)
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
            const profile = await this.getProfile(userId);
            if (!profile) return { success: false, reason: 'no_profile' };
            
            if (profile.bankBalance < amount) {
                return { success: false, reason: 'insufficient_funds' };
            }
    
            // หักเงินจากธนาคาร
            await this.updateProfile(userId, {
                bankBalance: profile.bankBalance - amount,
                'stats.bankStats.totalWithdraws': profile.stats.bankStats.totalWithdraws + amount,
                'stats.bankStats.largestWithdraw': Math.max(profile.stats.bankStats.largestWithdraw, amount)
            });
    
            // เพิ่มเงินในกระเป๋า
            const newBalance = await this.addMoney(userId, amount);
    
            return {
                success: true,
                newBalance,
                newBankBalance: profile.bankBalance - amount
            };
        } catch (error) {
            console.error('Error in withdraw:', error);
            return { success: false, reason: 'system_error' };
        }
    }

    async calculateBankLimit(userId) {
        try {
            const baseLimit = 10000; // ลิมิตพื้นฐาน
            const profile = await this.getProfile(userId);
            const level = await levelSystem.getLevel(userId);
            
            // เพิ่มลิมิต 5000 ต่อเลเวล
            const bonusLimit = level * 1000;
            const newLimit = baseLimit + bonusLimit;
    
            // อัพเดทลิมิตใหม่ในโปรไฟล์
            await this.updateProfile(userId, {
                bankLimit: newLimit
            });
    
            return newLimit;
        } catch (error) {
            console.error('Error calculating bank limit:', error);
            return 10000; // return base limit if error
        }
    }

    async processInterest(userId) {
        try {
            const profile = await this.getProfile(userId);
            if (!profile) return null;

            // Check last interest timestamp
            const lastInterest = profile.lastInterestPaid || 0;
            const now = Date.now();
            
            // Return if not enough time has passed
            if (now - lastInterest < this.INTEREST_CONFIG.INTERVAL) {
                return {
                    success: true,
                    timeRemaining: this.INTEREST_CONFIG.INTERVAL - (now - lastInterest),
                    nextPayout: lastInterest + this.INTEREST_CONFIG.INTERVAL
                };
            }

            // Check minimum balance requirement
            if (profile.bankBalance < this.INTEREST_CONFIG.MIN_BALANCE) {
                return {
                    success: false,
                    reason: 'insufficient_balance',
                    minimumRequired: this.INTEREST_CONFIG.MIN_BALANCE
                };
            }

            // Calculate interest
            const interest = Math.floor(profile.bankBalance * this.INTEREST_CONFIG.RATE);
            const cappedInterest = Math.min(interest, this.INTEREST_CONFIG.MAX_INTEREST);

            // Update bank balance and stats
            await this.updateProfile(userId, {
                bankBalance: profile.bankBalance + cappedInterest,
                lastInterestPaid: now,
                'stats.bankStats.totalInterestEarned': (profile.stats.bankStats.totalInterestEarned || 0) + cappedInterest
            });

            return {
                success: true,
                amount: cappedInterest,
                newBalance: profile.bankBalance + cappedInterest,
                nextPayout: now + this.INTEREST_CONFIG.INTERVAL
            };
        } catch (error) {
            console.error('Error processing interest:', error);
            return { success: false, reason: 'system_error' };
        }
    }










    async checkCooldown(userId, command) {
        const cooldown = this.cooldowns.get(`${userId}_${command}`);
        if (cooldown && Date.now() < cooldown) {
            return cooldown - Date.now();
        }
        return 0;
    }

    async setCooldown(userId, command, time) {
        this.cooldowns.set(`${userId}_${command}`, Date.now() + time);
    }
}

module.exports = new EconomySystem();