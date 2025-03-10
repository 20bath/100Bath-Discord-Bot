const { db } = require('../config/firebase');
const EconomySystem = require('./economySystem');

class ShopSystem {
    static items = {
        roles: [
            {
                id: 'rank_noble',
                name: '👑 Noble',
                price: { coins: 5000 },
                type: 'role',
                description: 'ยศสำหรับผู้มีเกียรติ รับโบนัส EXP 20%',
                benefits: { expBonus: 1.2, dailyBonus: 1.2 }
            },
            {
                id: 'rank_knight',
                name: '⚔️ Royal Knight',
                price: { coins: 10000 },
                type: 'role',
                description: 'ยศอัศวินแห่งราชา รับโบนัส EXP 50%',
                benefits: { expBonus: 1.5, dailyBonus: 1.5 }
            },
            {
                id: 'rank_duke',
                name: '👑 Grand Duke',
                price: { coins: 20000, gems: 10 },
                type: 'role',
                description: 'ยศดยุคผู้สูงศักดิ์ รับโบนัส EXP 100%',
                benefits: { expBonus: 2.0, dailyBonus: 2.0 }
            },
            {
                id: 'rank_emperor',
                name: '🏰 Emperor',
                price: { coins: 50000, gems: 50 },
                type: 'role',
                description: 'ยศจักรพรรดิผู้ยิ่งใหญ่ รับโบนัสทั้งหมด 200%',
                benefits: { expBonus: 3.0, dailyBonus: 3.0 }
            }
        ],
        items: [
            {
                id: 'lucky_charm',
                name: '🍀 Lucky Charm',
                price: { coins: 1000 },
                type: 'consumable',
                description: 'เพิ่มโอกาสชนะในการพนัน 20% เป็นเวลา 1 ชั่วโมง'
            },
            {
                id: 'exp_elixir',
                name: '⚡ EXP Elixir',
                price: { gems: 5 },
                type: 'consumable',
                description: 'เพิ่ม EXP 3 เท่าเป็นเวลา 30 นาที'
            },
            {
                id: 'money_potion',
                name: '💰 Fortune Potion',
                price: { gems: 10 },
                type: 'consumable',
                description: 'เพิ่มรางวัลเงินจากทุกแหล่ง 2 เท่าเป็นเวลา 1 ชั่วโมง'
            },
            {
                id: 'rank_reset',
                name: '🔄 Rank Reset Scroll',
                price: { gems: 20 },
                type: 'consumable',
                description: 'รีเซ็ตคูลดาวน์ของรางวัลรายวัน/รายสัปดาห์/รายเดือน'
            }
        ],
        special: [
            {
                id: 'gift_box',
                name: '🎁 Mystery Box',
                price: { coins: 5000 },
                type: 'special',
                description: 'กล่องสุ่มไอเทมพิเศษ มีโอกาสได้รับ Gems!'
            },
            {
                id: 'rainbow_badge',
                name: '🌈 Rainbow Badge',
                price: { gems: 100 },
                type: 'collectible',
                description: 'ตราสัญลักษณ์สุดหายาก แสดงสถานะความมั่งคั่งของคุณ'
            }
        ]
    };

    // แสดงรายการสินค้า
    static getShopItems() {
        return {
            roles: this.items.roles,
            items: this.items.items
        };
    }

    // ซื้อไอเทม
    static async buyItem(userId, guildId, itemId) {
        try {
            const userData = await EconomySystem.getUserData(userId, guildId);
            const item = [...this.items.roles, ...this.items.items]
                .find(i => i.id === itemId);

            if (!item) {
                return { success: false, reason: 'item_not_found' };
            }

            // ตรวจสอบเงิน
            if (item.price.coins && userData.coins < item.price.coins) {
                return { success: false, reason: 'not_enough_coins' };
            }
            if (item.price.gems && userData.gems < item.price.gems) {
                return { success: false, reason: 'not_enough_gems' };
            }

            // หักเงิน
            await EconomySystem.updateBalance(
                userId,
                guildId,
                -(item.price.coins || 0),
                -(item.price.gems || 0)
            );

            // เพิ่มไอเทมเข้า inventory
            await db.collection('economy')
                .doc(`${guildId}_${userId}`)
                .update({
                    inventory: [...userData.inventory, {
                        id: item.id,
                        purchasedAt: Date.now()
                    }]
                });

            return {
                success: true,
                item,
                newBalance: {
                    coins: userData.coins - (item.price.coins || 0),
                    gems: userData.gems - (item.price.gems || 0)
                }
            };
        } catch (error) {
            console.error('Error buying item:', error);
            throw error;
        }
    }

    static getItemData(itemId) {
        return [...this.items.roles, ...this.items.items].find(i => i.id === itemId);
    }
}

module.exports = ShopSystem;