const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../config/firebase');
const levelSystem = require('../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('แสดงอันดับผู้เล่นในด้านต่างๆ')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('หมวดหมู่ที่ต้องการดู')
                .setRequired(true)
                .addChoices(
                    { name: '📊 เลเวล', value: 'level' },
                    { name: '💰 เงินทั้งหมด', value: 'total_money' },
                    { name: '💼 ทำงานมากที่สุด', value: 'work' },
                    { name: '💸 ใช้เงินมากที่สุด', value: 'spending' },
                    { name: '🎲 กำไรจากการพนัน', value: 'gambling' },
                    { name: '🤝 โอนเงินสะสม', value: 'transfer' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const category = interaction.options.getString('category');
            let title, description, data;

            // Get all economy profiles
            const economySnapshot = await db.collection('economy').get();
            const economyData = economySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get all level data if needed
            let levelData = {};
            if (category === 'level') {
                const levelSnapshot = await db.collection('users').get();
                levelData = Object.fromEntries(
                    levelSnapshot.docs.map(doc => [doc.id, doc.data()])
                );
            }

            switch (category) {
                case 'level':
                    title = '📊 อันดับเลเวลสูงสุด';
                    description = 'ผู้เล่นที่มีเลเวลสูงที่สุด 10 อันดับแรก';
                    data = Object.entries(levelData)
                        .map(([id, data]) => ({
                            id,
                            value: data.level || 1,
                            detail: `Level ${data.level || 1}`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;

                case 'total_money':
                    title = '💰 อันดับคนรวยที่สุด';
                    description = 'ผู้เล่นที่มีเงินมากที่สุด 10 อันดับแรก (รวมเงินในกระเป๋าและธนาคาร)';
                    data = economyData
                        .map(profile => ({
                            id: profile.userId,
                            value: (profile.balance || 0) + (profile.bankBalance || 0),
                            detail: `💵 ${(profile.balance || 0) + (profile.bankBalance || 0)} บาท`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;

                case 'work':
                    title = '💼 อันดับคนขยันทำงาน';
                    description = 'ผู้เล่นที่ทำงานมากที่สุด 10 อันดับแรก';
                    data = economyData
                        .map(profile => ({
                            id: profile.userId,
                            value: profile.stats?.workStats?.jobsCompleted || 0,
                            detail: `🔨 ทำงาน ${profile.stats?.workStats?.jobsCompleted || 0} ครั้ง`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;

                case 'spending':
                    title = '💸 อันดับการใช้จ่าย';
                    description = 'ผู้เล่นที่ใช้เงินมากที่สุด 10 อันดับแรก';
                    data = economyData
                        .map(profile => ({
                            id: profile.userId,
                            value: profile.stats?.totalLost || 0,
                            detail: `💸 ${profile.stats?.totalLost || 0} บาท`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;

                case 'gambling':
                    title = '🎲 อันดับกำไรจากการพนัน';
                    description = 'ผู้เล่นที่ทำกำไรจากการพนันมากที่สุด 10 อันดับแรก';
                    data = economyData
                        .map(profile => ({
                            id: profile.userId,
                            value: (profile.stats?.gamblingStats?.totalEarned || 0) - (profile.stats?.gamblingStats?.totalLost || 0),
                            detail: `🎲 กำไร ${(profile.stats?.gamblingStats?.totalEarned || 0) - (profile.stats?.gamblingStats?.totalLost || 0)} บาท`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;

                case 'transfer':
                    title = '🤝 อันดับการโอนเงิน';
                    description = 'ผู้เล่นที่โอนเงินสะสมมากที่สุด 10 อันดับแรก';
                    data = economyData
                        .map(profile => ({
                            id: profile.userId,
                            value: profile.stats?.transferStats?.sent?.total || 0,
                            detail: `🤝 โอนไป ${profile.stats?.transferStats?.sent?.total || 0} บาท`
                        }))
                        .sort((a, b) => b.value - a.value);
                    break;
            }

            // Get user's rank before slicing data
            const userRank = data.findIndex(item => item.id === interaction.user.id) + 1;
            const userStats = data.find(item => item.id === interaction.user.id);

            // Get top 5 only (changed from 10)
            data = data.slice(0, 5);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#FFD700')
                .setDescription(description)
                .setTimestamp();

            // Add fields for each player
            for (let i = 0; i < data.length; i++) {
                const member = await interaction.guild.members.fetch(data[i].id).catch(() => null);
                if (member) {
                    let name = `${i + 1}. ${member.user.username}`;
                    // Add crown emoji for top 1
                    if (i === 0) name = `👑 ${name}`;
                    embed.addFields({
                        name: name,
                        value: data[i].detail,
                        inline: false
                    });
                }
            }

            // Add user's rank in footer if not in top 5
            if (userRank > 0) {
                const rankText = userRank <= 5 
                    ? '✨ คุณอยู่ในท็อป 5!'
                    : `📊 อันดับของคุณ: #${userRank} (${userStats.detail})`;
                embed.setFooter({ 
                    text: rankText,
                    iconURL: interaction.user.displayAvatarURL()
                });
            } else {
                embed.setFooter({ 
                    text: '❌ คุณยังไม่มีข้อมูลในอันดับนี้',
                    iconURL: interaction.user.displayAvatarURL()
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.editReply('❌ เกิดข้อผิดพลาดในการแสดงอันดับ');
        }
    }
};