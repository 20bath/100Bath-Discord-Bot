const { SlashCommandBuilder } = require('discord.js');
const QuestSystem = require('../utils/questDailySystem');
const economy = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('ดูเควสประจำวัน'),

    async execute(interaction) {
        await interaction.deferReply();

        const quests = await QuestSystem.getDailyQuests(interaction.user.id);
        if (!quests) {
            return interaction.editReply('❌ เกิดข้อผิดพลาดในการโหลดเควส');
        }

        const profile = await economy.getProfile(interaction.user.id);
        const questEmbed = QuestSystem.createQuestEmbed(quests);

        // Add streak information
        questEmbed.addFields({
            name: "🔥 Streak ปัจจุบัน",
            value: `${profile.questStreak || 0} วันติดต่อกัน\n${QuestSystem.getNextStreakInfo(profile.questStreak || 0)}`,
            inline: false
        });

        await interaction.editReply({ embeds: [questEmbed] });
    },
};