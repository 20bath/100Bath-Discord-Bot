const { EmbedBuilder } = require('discord.js');
const ExpSystem = require('../utils/expSystem');

module.exports = {
    name: 'level',
    description: 'ดูเลเวลและ EXP ของคุณ',
    requiresDatabase: true,
    async execute(interaction) {
        // ลบ deferReply ออกเพราะมีการ defer ใน index.js แล้ว
        try {
            const userData = await ExpSystem.getUserData(interaction.user.id, interaction.guild.id);
            
            if (!userData) {
                return await interaction.editReply('คุณยังไม่มีเลเวล! เริ่มพิมพ์ข้อความเพื่อรับ EXP กันเถอะ');
            }

            const nextLevelExp = ExpSystem.expNeeded(userData.level + 1);
            const currentExp = userData.exp;
            const progress = (currentExp / nextLevelExp) * 100;

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🏆 สถานะของ ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '📊 เลเวล', value: `${userData.level}`, inline: true },
                    { name: '⭐ EXP', value: `${currentExp}/${nextLevelExp}`, inline: true },
                    { name: '📈 ความคืบหน้า', value: `${progress.toFixed(2)}%` }
                )
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in level command:', error);
            return await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลเลเวล',
                ephemeral: true
            });
        }
    }
};