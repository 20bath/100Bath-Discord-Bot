const { db } = require('../config/firebase');

class RoleManager {
    static async addReactionRole(guildId, messageId, emoji, roleId) {
        try {
            await db.collection('reactionRoles').doc(`${guildId}_${messageId}_${emoji}`).set({
                guildId,
                messageId,
                emoji,
                roleId
            });
        } catch (error) {
            console.error('Error adding reaction role:', error);
            throw error;
        }
    }

    static async getReactionRole(guildId, messageId, emoji) {
        try {
            const doc = await db.collection('reactionRoles')
                .doc(`${guildId}_${messageId}_${emoji}`)
                .get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error getting reaction role:', error);
            throw error;
        }
    }
}

module.exports = RoleManager;