const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../config/firebase');
const { getRequiredXP } = require('../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('แสดงอันดับผู้เล่นที่เลเวลสูงสุด 10 อันดับแรก')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('ประเภทการแสดงผล')
                .addChoices(
                    { name: '🎮 เลเวล', value: 'level' },
                    { name: '⭐ XP', value: 'xp' }
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const type = interaction.options.getString('type') || 'level';
            const guild = interaction.guild;

            // ดึงข้อมูลผู้เล่นทั้งหมดที่อยู่ใน guild นี้
            const usersRef = db.collection('users');
            const snapshot = await usersRef.get();

            let leaderboardData = [];

           
            // รวบรวมข้อมูลผู้เล่น
            for (const doc of snapshot.docs) {
                const data = doc.data();
                    try {
                        const member = await guild.members.fetch(doc.id);
                        if (member) {
                            leaderboardData.push({
                                id: doc.id,
                                username: member.user.username,
                                level: data.level || 1,
                                xp: data.xp || 0
                            });
                        }
                    } catch (error) {
                        console.error(`Cannot fetch member ${doc.id}:`, error);
                    }
                
            }

            // เรียงลำดับตามประเภทที่เลือก
            leaderboardData.sort((a, b) => {
                if (type === 'level') {
                    if (b.level === a.level) {
                        return b.xp - a.xp;
                    }
                    return b.level - a.level;
                }
                return b.xp - a.xp;
            });

            // เลือก 10 อันดับแรก
            leaderboardData = leaderboardData.slice(0, 10);

            // สร้าง embed
            const embed = new EmbedBuilder()
                .setTitle(`🏆 อันดับผู้เล่นสูงสุด - ${type === 'level' ? 'เลเวล' : 'XP'}`)
                .setColor('#FFD700')
                .setDescription('10 อันดับแรกของเซิร์ฟเวอร์')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            // สร้างข้อความแสดงผล
            const fields = leaderboardData.map((user, index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                const requiredXP = getRequiredXP(user.level);
                const progress = type === 'level' 
                    ? `[${user.xp}/${requiredXP} XP]`
                    : `(Level ${user.level})`;

                return {
                    name: `${medal} ${user.username}`,
                    value: type === 'level'
                        ? `Level ${user.level} ${progress}`
                        : `${user.xp} XP ${progress}`,
                    inline: false
                };
            });

            if (fields.length === 0) {
                embed.setDescription('❌ ยังไม่มีข้อมูลผู้เล่นในเซิร์ฟเวอร์นี้');
            } else {
                embed.addFields(fields);
            }

            // เพิ่มตำแหน่งของผู้ใช้ที่ใช้คำสั่ง
            const userPosition = leaderboardData.findIndex(user => user.id === interaction.user.id);
            if (userPosition === -1) {
                embed.setFooter({ 
                    text: '❌ คุณยังไม่มีข้อมูลในระบบ' 
                });
            } else {
                embed.setFooter({ 
                    text: `🎯 อันดับของคุณ: #${userPosition + 1}` 
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาดในการแสดงอันดับ',
                ephemeral: true
            });
        }
    },
};