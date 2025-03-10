const { EmbedBuilder } = require('discord.js');
const ExpSystem = require('../utils/expSystem');

module.exports = {
    name: 'leaderboard',
    description: 'แสดงอันดับเลเวลสูงสุด',
    requiresDatabase: true,
    async execute(interaction) {
        // ลบ deferReply เพราะมีการ defer ใน index.js แล้ว
        try {
            const leaderboard = await ExpSystem.getLeaderboard(interaction.guild.id);
            
            if (!leaderboard.length) {
                return await interaction.editReply('ยังไม่มีข้อมูลอันดับในตอนนี้');
            }

            let description = '';
            let rank = 1;

            // สร้างข้อความแสดงอันดับ
            for (const data of leaderboard) {
                const user = await interaction.client.users.fetch(data.userId);
                const nextLevelExp = ExpSystem.expNeeded(data.level + 1);
                const progress = ((data.exp / nextLevelExp) * 100).toFixed(1);
                
                // เพิ่ม emoji ตามอันดับ
                let rankEmoji = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
                
                description += `${rankEmoji} **อันดับ ${rank}.** ${user}\n`;
                description += `┗ Level: ${data.level} • EXP: ${data.exp}/${nextLevelExp} (${progress}%)\n\n`;
                rank++;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🏆 อันดับเลเวลสูงสุดของ ${interaction.guild.name}`)
                .setDescription(description)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ 
                    text: `ขอดูโดย ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            return await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลอันดับ',
                ephemeral: true
            }).catch(console.error);
        }
    }
};