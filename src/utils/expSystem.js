const { db } = require('../config/firebase');

class ExpSystem {
    // คำนวณ Level จาก EXP
    static calculateLevel(exp) {
        return Math.floor(Math.sqrt(exp / 100)) + 1;
    }

    // คำนวณ EXP ที่ต้องการสำหรับ Level ถัดไป
    static expNeeded(level) {
        return Math.pow(level, 2) * 100;
    }

    // เพิ่ม EXP ให้ผู้ใช้
    static async addExp(userId, guildId, amount) {
        try {
            const userRef = db.collection('exp').doc(`${guildId}_${userId}`);
            const doc = await userRef.get();

            if (!doc.exists) {
                // สร้างข้อมูลใหม่ถ้ายังไม่มี
                await userRef.set({
                    userId,
                    guildId,
                    exp: amount,
                    level: 1,
                    lastMessage: Date.now()
                });
                return { newLevel: 1, levelUp: false };
            }

            const userData = doc.data();
            const newExp = userData.exp + amount;
            const newLevel = this.calculateLevel(newExp);
            const levelUp = newLevel > userData.level;

            await userRef.update({
                exp: newExp,
                level: newLevel,
                lastMessage: Date.now()
            });

            return { newLevel, levelUp };
        } catch (error) {
            console.error('Error adding exp:', error);
            throw error;
        }
    }

    // ดึงข้อมูล EXP ของผู้ใช้
    static async getUserData(userId, guildId) {
        try {
            const doc = await db.collection('exp').doc(`${guildId}_${userId}`).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    // ดึง Leaderboard
    static async getLeaderboard(guildId, limit = 10) {
        try {
            const snapshot = await db.collection('exp')
                .where('guildId', '==', guildId)
                .orderBy('level', 'desc')
                .orderBy('exp', 'desc')
                .limit(limit)
                .get();

            // ถ้า index ยังสร้างไม่เสร็จ
            if (!snapshot.empty) {
                return snapshot.docs.map(doc => doc.data());
            } else {
                // ใช้การ query แบบง่ายๆ ก่อน
                const simpleSnapshot = await db.collection('exp')
                    .where('guildId', '==', guildId)
                    .get();
                
                return simpleSnapshot.docs
                    .map(doc => doc.data())
                    .sort((a, b) => {
                        if (b.level !== a.level) return b.level - a.level;
                        return b.exp - a.exp;
                    })
                    .slice(0, limit);
            }
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }
}

module.exports = ExpSystem;