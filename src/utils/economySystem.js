const { db, admin } = require('../config/firebase');

class EconomySystem {
    // ค่าเริ่มต้นสำหรับผู้เล่นใหม่
    static defaultData = {
        coins: 1000, // เพิ่มเงินเริ่มต้น
        gems: 0,
        lastDaily: null,
        lastWeekly: null,
        lastMonthly: null,
        lastWork: null,
        inventory: [],
        roles: [],
        transactions: [], // เพิ่มประวัติธุรกรรม
        stats: {
            totalSpent: 0,
            totalEarned: 0,
            gamblingWins: 0,
            gamblingLosses: 0
        }
    };

    // ปรับรางวัลให้สมดุล
    static rewards = {
        daily: { coins: 500, gems: 1 },     // ประมาณ 1 ไอเทมทั่วไป
        weekly: { coins: 5000, gems: 5 },   // ประมาณ 1 ยศระดับกลาง
        monthly: { coins: 25000, gems: 25 }, // ประมาณ 1 ยศระดับสูง
        work: { 
            minCoins: 100, 
            maxCoins: 1000,
            cooldown: 30 * 60 * 1000 // 30 นาที
        }
    };

    // ค่าคงที่สำหรับระบบเศรษฐกิจ
    static ECONOMY_CONSTANTS = {
        MINIMUM_ACTIVE_USERS: 3,            // จำนวนผู้เล่นขั้นต่ำ
        HEALTHY_TRANSACTION_RATIO: 0.3,     // ธุรกรรมต่อผู้ใช้
        ECONOMY_BALANCE_RATIO: 0.7,         // สัดส่วนรายได้/รายจ่าย
        BASE_ITEM_PRICE: 500,              // ราคาไอเทมพื้นฐาน
        MAX_INFLATION_RATE: 1.5,           // เพิ่มราคาสูงสุด 50%
        MIN_DEFLATION_RATE: 0.7,           // ลดราคาต่ำสุด 30%
        PRICE_UPDATE_FREQUENCY: 24 * 60 * 60 * 1000 // 24 ชั่วโมง
    };

    // ปรับอัตราการเปลี่ยนแปลงราคา
    static marketAdjustments = {
        recession: {
            rate: 0.90,    // -10%
            duration: 48,   // 48 ชั่วโมง
            recovery: 0.02  // ฟื้นตัว 2% ต่อชั่วโมง
        },
        deflation: {
            rate: 0.95,    // -5%
            duration: 24,   // 24 ชั่วโมง
            recovery: 0.01  // ฟื้นตัว 1% ต่อชั่วโมง
        },
        inflation: {
            rate: 1.05,    // +5%
            duration: 24,   // 24 ชั่วโมง
            decay: 0.01    // ลดลง 1% ต่อชั่วโมง
        }
    };

    // เพิ่มฟังก์ชันคำนวณราคาที่เหมาะสม
    static calculateNewPrice(basePrice, condition) {
        const adjustment = this.marketAdjustments[condition];
        if (!adjustment) return basePrice;

        let newPrice = basePrice * adjustment.rate;
        
        // ไม่ให้ราคาต่ำหรือสูงเกินไป
        newPrice = Math.max(
            basePrice * this.ECONOMY_CONSTANTS.MIN_DEFLATION_RATE,
            Math.min(newPrice, basePrice * this.ECONOMY_CONSTANTS.MAX_INFLATION_RATE)
        );

        return Math.floor(newPrice);
    }

    // เพิ่มฟังก์ชันบันทึกธุรกรรม
    static async logTransaction(userId, guildId, type, amount, details = {}) {
        try {
            const userRef = db.collection('economy').doc(`${guildId}_${userId}`);
            const transaction = {
                type,
                amount,
                timestamp: Date.now(),
                ...details
            };

            await userRef.update({
                transactions: admin.firestore.FieldValue.arrayUnion(transaction),
                'stats.totalTransactions': admin.firestore.FieldValue.increment(1),
                [`stats.${amount > 0 ? 'totalEarned' : 'totalSpent'}`]: 
                    admin.firestore.FieldValue.increment(Math.abs(amount))
            });

            return transaction;
        } catch (error) {
            console.error('Error logging transaction:', error);
            throw error;
        }
    }

    // รางวัลต่างๆ
    static rewards = {
        daily: { coins: 100, gems: 1 },
        weekly: { coins: 1000, gems: 10 },
        monthly: { coins: 5000, gems: 50 },
        work: { minCoins: 50, maxCoins: 200 }
    };

    // คูลดาวน์
    static cooldowns = {
        daily: 24 * 60 * 60 * 1000, // 24 ชั่วโมง
        weekly: 7 * 24 * 60 * 60 * 1000, // 7 วัน
        monthly: 30 * 24 * 60 * 60 * 1000, // 30 วัน
        work: 1 * 60 * 60 * 1000 // 1 ชั่วโมง
    };

    // เพิ่มในคลาส EconomySystem
    static inflationReasons = [
        { reason: '🏦 ธนาคารกลางปรับขึ้นดอกเบี้ย', rate: 1.05, emoji: '📈' },
        { reason: '📊 ราคาสินค้าในตลาดพุ่งสูงขึ้น', rate: 1.08, emoji: '💹' },
        { reason: '💱 อัตราแลกเปลี่ยนผันผวน', rate: 1.03, emoji: '📉' },
        { reason: '🌍 เศรษฐกิจโลกตกต่ำ', rate: 1.10, emoji: '📊' },
        { reason: '🏭 ต้นทุนการผลิตเพิ่มขึ้น', rate: 1.07, emoji: '⚡' },
        { reason: '🛢️ ราคาน้ำมันพุ่งสูง', rate: 1.06, emoji: '⛽' },
        { reason: '🌾 ผลผลิตทางการเกษตรลดลง', rate: 1.04, emoji: '🌱' }
    ];

    static async checkAndApplyInflation(client) {
        try {
            // ตรวจสอบทุก 24 ชั่วโมง
            setInterval(async () => {
                // ดึงสถิติการใช้งานในรอบ 24 ชั่วโมง
                const stats = await this.getEconomyStats();
                const marketCondition = await this.calculateMarketCondition(stats);
                
                // ปรับราคาตามสภาพตลาด
                await this.adjustPrices(marketCondition, client);
            }, 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error('Error in inflation system:', error);
        }
    }

    // คำนวณสถิติเศรษฐกิจ
    static async getEconomyStats() {
        try {
            const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
            const snapshot = await db.collection('economy')
                .where('lastTransaction', '>', last24Hours)
                .get();

            return {
                activeUsers: snapshot.size,
                totalTransactions: snapshot.docs.reduce((acc, doc) => acc + (doc.data().dailyTransactions || 0), 0),
                totalCoinsSpent: snapshot.docs.reduce((acc, doc) => acc + (doc.data().dailyCoinsSpent || 0), 0),
                totalCoinsEarned: snapshot.docs.reduce((acc, doc) => acc + (doc.data().dailyCoinsEarned || 0), 0)
            };
        } catch (error) {
            console.error('Error getting economy stats:', error);
            return null;
        }
    }

    // คำนวณสภาพตลาด
    static async calculateMarketCondition(stats) {
        if (!stats) return 'stable';

        // ตัวแปรที่ใช้ในการคำนวณ
        const MINIMUM_ACTIVE_USERS = 5;
        const HEALTHY_TRANSACTION_RATIO = 0.5; // ธุรกรรมต่อผู้ใช้
        const ECONOMY_BALANCE_RATIO = 0.8; // สัดส่วนรายได้/รายจ่าย

        // คำนวณดัชนีเศรษฐกิจ
        const transactionRatio = stats.totalTransactions / (stats.activeUsers || 1);
        const economyRatio = stats.totalCoinsEarned / (stats.totalCoinsSpent || 1);

        // ตัดสินใจปรับราคา
        if (stats.activeUsers < MINIMUM_ACTIVE_USERS) {
            return 'recession'; // เศรษฐกิจถดถอย
        } else if (transactionRatio < HEALTHY_TRANSACTION_RATIO) {
            return 'deflation'; // เงินฝืด
        } else if (economyRatio < ECONOMY_BALANCE_RATIO) {
            return 'inflation'; // เงินเฟ้อ
        }

        return 'stable'; // เศรษฐกิจปกติ
    }

    // ปรับราคาตามสภาพตลาด
    static async adjustPrices(condition, client) {
        const adjustmentRates = {
            recession: 0.85,    // ลดราคา 15%
            deflation: 0.95,    // ลดราคา 5%
            inflation: 1.05,    // เพิ่มราคา 5%
            stable: 1.00        // ราคาคงที่
        };

        const rate = adjustmentRates[condition];
        if (rate === 1.00) return; // ไม่มีการเปลี่ยนแปลงถ้าเศรษฐกิจปกติ

        // ปรับราคาสินค้า
        for (const item of [...ShopSystem.items.roles, ...ShopSystem.items.items, ...ShopSystem.items.special]) {
            if (item.price.coins) {
                const oldPrice = item.price.coins;
                item.price.coins = Math.max(
                    Math.floor(oldPrice * rate),
                    item.basePrice || oldPrice * 0.5 // ไม่ให้ต่ำกว่าราคาฐาน
                );
            }
        }

        // ส่งการแจ้งเตือน
        const messages = {
            recession: '📉 เศรษฐกิจถดถอย ราคาสินค้าลดลง 15%',
            deflation: '💹 เงินฝืด ราคาสินค้าลดลง 5%',
            inflation: '📈 เงินเฟ้อ ราคาสินค้าเพิ่มขึ้น 5%'
        };

        const embed = new EmbedBuilder()
            .setColor(condition === 'inflation' ? '#ff9900' : '#00ff00')
            .setTitle('📊 รายงานสภาวะเศรษฐกิจ')
            .setDescription(messages[condition])
            .addFields(
                { 
                    name: '📈 สถานะตลาด',
                    value: `• การปรับราคา: ${((rate - 1) * 100).toFixed(1)}%\n` +
                           `• สาเหตุ: ${this.getMarketReason(condition)}`
                }
            )
            .setTimestamp();

        // ส่งการแจ้งเตือนไปยังช่องที่กำหนด
        const channel = client.channels.cache.get(process.env.ECONOMY_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    }

    // สร้างเหตุผลการเปลี่ยนแปลงของตลาด
    static getMarketReason(condition) {
        const reasons = {
            recession: [
                '🏢 ผู้ใช้งานในตลาดลดลง',
                '📊 กิจกรรมทางเศรษฐกิจต่ำ',
                '💸 การใช้จ่ายในตลาดลดลง'
            ],
            deflation: [
                '📦 สินค้าในตลาดล้นตลาด',
                '💰 การหมุนเวียนเงินในระบบต่ำ',
                '📉 ความต้องการสินค้าลดลง'
            ],
            inflation: [
                '📈 ความต้องการสินค้าสูงขึ้น',
                '💹 การใช้จ่ายในตลาดเพิ่มขึ้น',
                '🏦 ปริมาณเงินในระบบเพิ่มขึ้น'
            ]
        };

        return reasons[condition][Math.floor(Math.random() * reasons[condition].length)];
    }

    // ดึงข้อมูลผู้เล่น
    static async getUserData(userId, guildId) {
        try {
            const doc = await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .get();

            if (!doc.exists) {
                // สร้างข้อมูลใหม่
                await this.createUser(userId, guildId);
                return this.defaultData;
            }

            return doc.data();
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    // สร้างผู้เล่นใหม่
    static async createUser(userId, guildId) {
        try {
            await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .set({
                    userId,
                    guildId,
                    ...this.defaultData,
                    createdAt: Date.now()
                });
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // อัพเดทเงิน
    static async updateBalance(userId, guildId, coins, gems = 0, transactionType = 'unknown') {
        try {
            const userRef = db.collection('economy').doc(`${guildId}_${userId}`);
            const userData = await this.getUserData(userId, guildId);
    
            // อัพเดทยอดเงิน
            const update = {
                coins: userData.coins + coins,
                gems: userData.gems + gems,
                lastTransaction: Date.now()
            };
    
            // บันทึกธุรกรรม
            await this.logTransaction(userId, guildId, transactionType, coins, {
                gemsChange: gems,
                newBalance: update.coins,
                newGems: update.gems
            });
    
            await userRef.update(update);
    
            return { 
                newCoins: update.coins,
                newGems: update.gems,
                change: { coins, gems }
            };
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    }

    // ระบบฟาร์มเงินรายวัน/สัปดาห์/เดือน
    static async claimReward(userId, guildId, rewardType) {
        try {
            const userData = await this.getUserData(userId, guildId);
            const now = Date.now();
            const lastClaim = userData[`last${rewardType}`];
            const cooldown = this.cooldowns[rewardType.toLowerCase()];

            if (lastClaim && (now - lastClaim) < cooldown) {
                const remaining = cooldown - (now - lastClaim);
                return {
                    success: false,
                    timeRemaining: remaining
                };
            }

            const reward = this.rewards[rewardType.toLowerCase()];
            await this.updateBalance(userId, guildId, reward.coins, reward.gems);
            
            // อัพเดทเวลา
            await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .update({
                    [`last${rewardType}`]: now
                });

            return {
                success: true,
                reward
            };
        } catch (error) {
            console.error(`Error claiming ${rewardType}:`, error);
            throw error;
        }
    }

    // ระบบการพนัน
    static async gamble(userId, guildId, amount, game, bet) {
        try {
            const userData = await this.getUserData(userId, guildId);
            if (userData.coins < amount) {
                return { success: false, reason: 'not_enough_coins' };
            }

            let winAmount = 0;
            let won = false;

            switch (game) {
                case 'coinflip':
                    won = Math.random() < 0.49; // 49% โอกาสชนะ
                    winAmount = won ? amount * 2 : -amount;
                    break;
                    
                case 'dice':
                    const roll = Math.floor(Math.random() * 6) + 1;
                    won = roll === bet;
                    winAmount = won ? amount * 5 : -amount;
                    break;

                case 'slots':
                    const symbols = ['🍎', '🍊', '🍇', '💎', '7️⃣'];
                    const results = Array(3).fill().map(() => 
                        symbols[Math.floor(Math.random() * symbols.length)]
                    );
                    won = results.every(symbol => symbol === results[0]);
                    winAmount = won ? amount * 10 : -amount;
                    break;
            }

            // ใน claimReward หรือ useItem:
            if (userData.buffs?.gambling) {
                if (Date.now() < userData.buffs.gambling.expiresAt) {
                    // เพิ่มโอกาสชนะตาม buff
                    winChance *= (1 + userData.buffs.gambling.value);
                }
            }

            await this.updateBalance(userId, guildId, winAmount);
            await this.updateGamblingStats(userId, guildId, won);

            return {
                success: true,
                won,
                winAmount,
                newBalance: userData.coins + winAmount
            };
        } catch (error) {
            console.error('Error in gambling:', error);
            throw error;
        }
    }

    // เพิ่มในคลาส EconomySystem
    static async updateGamblingStats(userId, guildId, won) {
        try {
            const userRef = db.collection('economy').doc(`${guildId}_${userId}`);
            await userRef.update({
                [`stats.gambling${won ? 'Wins' : 'Losses'}`]: admin.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Error updating gambling stats:', error);
            throw error;
        }
    }

    // ระบบทำงาน
    static async work(userId, guildId) {
        try {
            const userData = await this.getUserData(userId, guildId);
            const now = Date.now();
            
            if (userData.lastWork && (now - userData.lastWork) < this.cooldowns.work) {
                return {
                    success: false,
                    timeRemaining: this.cooldowns.work - (now - userData.lastWork)
                };
            }

            const earnedCoins = Math.floor(
                Math.random() * 
                (this.rewards.work.maxCoins - this.rewards.work.minCoins + 1) + 
                this.rewards.work.minCoins
            );

            await this.updateBalance(userId, guildId, earnedCoins);
            await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .update({ lastWork: now });

            return {
                success: true,
                earnedCoins
            };
        } catch (error) {
            console.error('Error in work system:', error);
            throw error;
        }
    }

    static async useItem(userId, guildId, itemId) {
        try {
            const userData = await this.getUserData(userId, guildId);
            const itemIndex = userData.inventory.findIndex(item => item.id === itemId);

            if (itemIndex === -1) {
                return { success: false, reason: 'item_not_found' };
            }

            const item = ShopSystem.getItemData(itemId);
            if (!item) {
                return { success: false, reason: 'invalid_item' };
            }

            // ดำเนินการตามประเภทไอเทม
            let effectMessage = '';
            switch (itemId) {
                case 'lucky_coin':
                    // เพิ่มโบนัสการพนันชั่วคราว
                    await db.collection('economy')
                        .doc(`${guildId}_${userId}`)
                        .update({
                            'buffs.gambling': {
                                type: 'luck_boost',
                                value: 0.1,
                                expiresAt: Date.now() + (30 * 60 * 1000) // 30 นาที
                            }
                        });
                    effectMessage = '🍀 เพิ่มโอกาสชนะ 10% เป็นเวลา 30 นาที';
                    break;

                case 'exp_boost':
                    // เพิ่มโบนัส EXP
                    await db.collection('economy')
                        .doc(`${guildId}_${userId}`)
                        .update({
                            'buffs.exp': {
                                type: 'exp_boost',
                                value: 2,
                                expiresAt: Date.now() + (60 * 60 * 1000) // 1 ชั่วโมง
                            }
                        });
                    effectMessage = '⭐ เพิ่ม EXP 2 เท่าเป็นเวลา 1 ชั่วโมง';
                    break;
            }

            // ลบไอเทมออกจาก inventory
            userData.inventory.splice(itemIndex, 1);
            await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .update({
                    inventory: userData.inventory
                });

            return {
                success: true,
                item,
                message: effectMessage
            };
        } catch (error) {
            console.error('Error using item:', error);
            throw error;
        }
    }

    // เช็คและใช้งานโบนัส
    static async checkBuffs(userId, guildId, buffType) {
        try {
            const userData = await this.getUserData(userId, guildId);
            const buff = userData.buffs?.[buffType];

            if (!buff || Date.now() > buff.expiresAt) {
                // ลบ buff ที่หมดอายุ
                if (buff) {
                    await db.collection('economy')
                        .doc(`${guildId}_${userId}`)
                        .update({
                            [`buffs.${buffType}`]: null
                        });
                }
                return null;
            }

            return buff;
        } catch (error) {
            console.error('Error checking buffs:', error);
            throw error;
        }
    }

    static async getProfile(userId, guildId) {
        try {
            const userData = await this.getUserData(userId, guildId);
            const activeBuffs = {};
            
            // ตรวจสอบ buff ที่ยังใช้งานได้
            if (userData.buffs) {
                const now = Date.now();
                for (const [type, buff] of Object.entries(userData.buffs)) {
                    if (buff && buff.expiresAt > now) {
                        activeBuffs[type] = {
                            ...buff,
                            timeLeft: Math.ceil((buff.expiresAt - now) / (1000 * 60)) // เวลาที่เหลือเป็นนาที
                        };
                    }
                }
            }

            // คำนวณเวลาที่เหลือสำหรับรางวัลต่างๆ
            const rewards = {
                daily: this.getNextRewardTime(userData.lastDaily, this.cooldowns.daily),
                weekly: this.getNextRewardTime(userData.lastWeekly, this.cooldowns.weekly),
                monthly: this.getNextRewardTime(userData.lastMonthly, this.cooldowns.monthly),
                work: this.getNextRewardTime(userData.lastWork, this.cooldowns.work)
            };

            // รวมข้อมูลทั้งหมด
            return {
                ...userData,
                activeBuffs,
                rewards,
                stats: {
                    ...userData.stats,
                    winRate: userData.stats.gamblingWins / 
                        (userData.stats.gamblingWins + userData.stats.gamblingLosses) || 0
                }
            };
        } catch (error) {
            console.error('Error getting profile:', error);
            throw error;
        }
    }

    static getNextRewardTime(lastClaim, cooldown) {
        if (!lastClaim) return { available: true, timeLeft: 0 };
        
        const now = Date.now();
        const nextAvailable = lastClaim + cooldown;
        const timeLeft = nextAvailable - now;

        return {
            available: timeLeft <= 0,
            timeLeft: Math.max(0, Math.ceil(timeLeft / (1000 * 60))) // เวลาที่เหลือเป็นนาที
        };
    }
}

module.exports = EconomySystem;