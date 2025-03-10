const { EmbedBuilder } = require('discord.js');
const ExpSystem = require('../utils/expSystem');
const LevelRoles = require('../utils/levelRoles');

// สร้าง Map เพื่อเก็บเวลาเริ่มต้น
const voiceStartTimes = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        // ไม่นับ EXP สำหรับ bot
        if (newState.member.user.bot) return;

        const userId = newState.member.user.id;
        const guildId = newState.guild.id;
        const memberKey = `${guildId}-${userId}`;

        try {
            // เช็คการเข้าห้อง Voice
            if (!oldState.channelId && newState.channelId) {
                console.log(`${newState.member.user.tag} เข้าห้อง voice`);
                voiceStartTimes.set(memberKey, Date.now());
            }
            // เช็คการออกจากห้อง Voice
            else if (oldState.channelId && !newState.channelId) {
                console.log(`${oldState.member.user.tag} ออกจากห้อง voice`);
                const startTime = voiceStartTimes.get(memberKey);
                
                if (!startTime) {
                    console.log('ไม่พบเวลาเริ่มต้น');
                    return;
                }

                const endTime = Date.now();
                const timeSpent = Math.floor((endTime - startTime) / 1000); // แปลงเป็นวินาที
                console.log(`ใช้เวลาในห้อง: ${timeSpent} วินาที`);

                // ให้ EXP ทุกๆ 1 นาที
                if (timeSpent >= 60) {
                    const expGained = Math.floor(timeSpent / 60) * 3; // 3 EXP ต่อนาที
                    console.log(`${oldState.member.user.tag} จะได้รับ EXP: ${expGained}`);

                    const result = await ExpSystem.addExp(userId, guildId, expGained);
                    console.log('เพิ่ม EXP สำเร็จ:', result);

                    // ถ้า Level Up ให้ส่งข้อความแจ้งเตือน
                    if (result.levelUp) {
                        // อัพเดทยศ
                        const roleUpdated = await LevelRoles.updateMemberRoles(oldState.member, result.newLevel);

                        const channel = oldState.guild.channels.cache.get('1348538344287764506');
                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setColor(LevelRoles.getPastelColor(result.newLevel))
                                .setTitle('🎉 Level Up!')
                                .setDescription(
                                    `ยินดีด้วย ${oldState.member}! คุณได้เลเวลอัพเป็น **${result.newLevel}**\n` +
                                    `${roleUpdated ? `และได้รับยศ ${LevelRoles.getRoleName(result.newLevel)} 🌟` : ''}\n` +
                                    `จากการใช้งานห้องเสียง ${Math.floor(timeSpent/60)} นาที`
                                )
                                .setThumbnail(oldState.member.user.displayAvatarURL())
                                .setTimestamp();

                            await channel.send({ embeds: [embed] });
                            console.log('ส่งข้อความ Level Up สำเร็จ');
                        }
                    }
                }

                // ลบเวลาเริ่มต้นออกจาก Map
                voiceStartTimes.delete(memberKey);
            }
            // กรณีย้ายห้อง (เก็บเวลาเดิมไว้)
            else if (oldState.channelId !== newState.channelId) {
                console.log(`${newState.member.user.tag} ย้ายห้อง voice`);
                // ไม่ต้องทำอะไร เพราะใช้ Map เก็บเวลา
            }
        } catch (error) {
            console.error('Error in voiceStateUpdate:', error);
        }
    }
};