const { EmbedBuilder } = require('discord.js');
const ExpSystem = require('../utils/expSystem');
const LevelRoles = require('../utils/levelRoles');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        try {
            const expGained = Math.floor(Math.random() * 11) + 5;
            const result = await ExpSystem.addExp(message.author.id, message.guild.id, expGained);

            if (result.levelUp) {
                try {
                    // อัพเดทยศ
                    const roleUpdated = await LevelRoles.updateMemberRoles(message.member, result.newLevel);
                    console.log(`ผลการอัพเดทยศ: ${roleUpdated ? 'สำเร็จ' : 'ไม่สำเร็จ'}`);

                    const embed = new EmbedBuilder()
                        .setColor(LevelRoles.getPastelColor(result.newLevel))
                        .setTitle('🎉 Level Up!')
                        .setDescription(
                            `ยินดีด้วย ${message.author}! คุณได้เลเวลอัพเป็น **${result.newLevel}**\n` +
                            `${roleUpdated ? `และได้รับยศ ${LevelRoles.getRoleName(result.newLevel)} 🌟` : ''}`
                        )
                        .setThumbnail(message.author.displayAvatarURL())
                        .setTimestamp();

                    message.channel.send({ embeds: [embed] });
                } catch (error) {
                    console.error('เกิดข้อผิดพลาดในการอัพเดทยศ:', error);
                }
            }
        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    }
};