const { EmbedBuilder } = require('discord.js');
const EconomySystem = require('../utils/economySystem');

module.exports = {
    name: 'profile',
    description: 'แสดงข้อมูลโปรไฟล์และคลังไอเทม',
    requiresDatabase: true,
    options: [
        {
            name: 'user',
            description: 'ผู้ใช้ที่ต้องการดูข้อมูล (ไม่ระบุ = ตัวเอง)',
            type: 6,
            required: false
        }
    ],
    async execute(interaction) {
        try {
            const target = interaction.options.getUser('user') || interaction.user;
            const profile = await EconomySystem.getProfile(target.id, interaction.guild.id);

            if (!profile) {
                return await interaction.editReply({
                    content: '❌ ไม่พบข้อมูลผู้ใช้',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle(`🎮 โปรไฟล์ของ ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '💰 สถานะการเงิน',
                        value: 
                            `┣ 🪙 เหรียญ: ${profile.coins.toLocaleString()}\n` +
                            `┣ 💎 เพชร: ${profile.gems.toLocaleString()}\n` +
                            `┗ 💹 รายได้สุทธิ: ${(profile.stats.totalEarned - profile.stats.totalSpent).toLocaleString()}`
                    },
                    {
                        name: '👑 ยศและโบนัส',
                        value: profile.roles.length ? 
                            profile.roles.map(role => 
                                `┣ ${role.name}\n` +
                                `┗ 📈 โบนัส EXP +${((role.benefits.expBonus - 1) * 100).toFixed(0)}%`
                            ).join('\n\n') : 
                            'ไม่มียศ'
                    },
                    {
                        name: '🎒 ไอเทมที่มี',
                        value: profile.inventory.length ? 
                            profile.inventory.map(item => 
                                `┣ ${item.name}\n` +
                                `┗ ⏰ หมดอายุ: ${new Date(item.expiresAt).toLocaleString()}`
                            ).join('\n\n') : 
                            'ไม่มีไอเทม'
                    },
                    {
                        name: '📊 สถิติการเล่น',
                        value:
                            `┣ 💰 รายได้ทั้งหมด: ${profile.stats.totalEarned.toLocaleString()}\n` +
                            `┣ 💸 รายจ่ายทั้งหมด: ${profile.stats.totalSpent.toLocaleString()}\n` +
                            `┣ 🎲 ชนะพนัน: ${profile.stats.gamblingWins || 0} ครั้ง\n` +
                            `┣ 📉 แพ้พนัน: ${profile.stats.gamblingLosses || 0} ครั้ง\n` +
                            `┗ 📊 อัตราชนะ: ${((profile.stats.winRate || 0) * 100).toFixed(1)}%`
                    }
                );

            // แสดง Buff ที่กำลังใช้งาน
            if (Object.keys(profile.activeBuffs).length > 0) {
                embed.addFields({
                    name: '🎭 Buff ที่ใช้งาน',
                    value: Object.entries(profile.activeBuffs)
                        .map(([type, buff]) => 
                            `┣ ${type === 'gambling' ? '🍀' : '⭐'} ${buff.type}\n` +
                            `┣ 📈 พลัง: ${buff.value}x\n` +
                            `┗ ⏰ เหลือเวลา: ${buff.timeLeft} นาที`
                        ).join('\n\n')
                });
            }

            // แสดงเวลารับรางวัล
            embed.addFields({
                name: '⏰ เวลารับรางวัล',
                value:
                    `┣ 📅 รายวัน: ${profile.rewards.daily.available ? '✅ พร้อมรับ' : `⏳ อีก ${profile.rewards.daily.timeLeft} นาที`}\n` +
                    `┣ 📅 รายสัปดาห์: ${profile.rewards.weekly.available ? '✅ พร้อมรับ' : `⏳ อีก ${profile.rewards.weekly.timeLeft} นาที`}\n` +
                    `┣ 📅 รายเดือน: ${profile.rewards.monthly.available ? '✅ พร้อมรับ' : `⏳ อีก ${profile.rewards.monthly.timeLeft} นาที`}\n` +
                    `┗ 💼 ทำงาน: ${profile.rewards.work.available ? '✅ พร้อมทำงาน' : `⏳ อีก ${profile.rewards.work.timeLeft} นาที`}`
            });

            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in profile command:', error);
            return await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                ephemeral: true
            });
        }
    }
};