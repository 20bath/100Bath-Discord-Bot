const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const achievement = require('../utils/achievementSystem');
const economy = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievement')
        .setDescription('ดูความสำเร็จที่ได้รับและยังไม่ได้รับ')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('ผู้เล่นที่ต้องการดูความสำเร็จ')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const profile = await economy.getProfile(targetUser.id);

            if (!profile) {
                return interaction.editReply('❌ ไม่พบข้อมูลผู้เล่น');
            }

            const earnedAchievements = profile.achievements || [];
            const stats = await achievement.getAchievementStats(targetUser.id);

            // Create main embed
            const embed = new EmbedBuilder()
                .setTitle(`🏆 ความสำเร็จของ ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor('#FFD700')
                .setDescription(
                    `ได้รับแล้ว ${stats.earned} จาก ${stats.total} รายการ ` +
                    `(${Math.floor((stats.earned / stats.total) * 100)}%)`
                );

            // Group achievements by category
            const categories = {
                'การเงิน': ['first_million', 'high_roller'],
                'การทำงาน': ['workaholic', 'master_worker'],
                'การพนัน': ['lucky_streak', 'gambling_master'],
                'การธนาคาร': ['savings_master']
            };

            // Add fields for each category
            for (const [category, achievementIds] of Object.entries(categories)) {
                const achievementList = achievementIds.map(id => {
                    const ach = achievement.achievements[id];
                    const isEarned = earnedAchievements.includes(id);
                    return `${isEarned ? ach.icon : '🔒'} **${ach.name}**\n` +
                           `└ ${ach.description}\n` +
                           `└ 💎 รางวัล: ${ach.reward?.gems || 0} เพชร\n` +
                           `└ ${isEarned ? '✅ ได้รับแล้ว' : '❌ ยังไม่ได้รับ'}`;
                }).join('\n\n');

                embed.addFields({
                    name: `📑 ${category}`,
                    value: achievementList,
                    inline: false
                });
            }

            // Add progress hint for the first locked achievement
            const firstLocked = Object.values(achievement.achievements)
                .find(ach => !earnedAchievements.includes(ach.id));

            if (firstLocked) {
                embed.setFooter({
                    text: `💡 แนะนำ: ลองพยายามทำ "${firstLocked.name}" เป็นอันต่อไป!`
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in achievement command:', error);
            await interaction.editReply('❌ เกิดข้อผิดพลาดในการแสดงความสำเร็จ');
        }
    }
};