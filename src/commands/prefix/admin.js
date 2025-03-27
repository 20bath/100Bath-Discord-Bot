const { PermissionFlagsBits , EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
module.exports = (client) => {

    client.on("messageCreate", async (message) => {

        if (!message.guild || !message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
        // ต้องเป็น Admin เท่านั้นที่ใช้คำสั่งได้      
        if (message.content === "!testjoin") {
          // จำลองคนเข้า
          client.emit("guildMemberAdd", message.member);
          message.reply("🔧 Testing member join event...");
        }
      
        if (message.content === "!testleave") {
          // จำลองคนออก
          client.emit("guildMemberRemove", message.member);
          message.reply("🔧 Testing member leave event...");
        }



        // !announce #channel | หัวข้อ | ข้อความ
        // !announce #announcements | อัพเดทระบบใหม่ | เพิ่มระบบธนาคารและดอกเบี้ย!
        // !maintenance ระยะเวลา | เหตุผล
        // !maintenance 30 นาที | อัพเดทระบบการพนัน


        // คำสั่งสำหรับประกาศปิดปรับปรุง
        if (message.content.startsWith('!maintenance')) {
            try {
                const args = message.content.slice('!maintenance'.length).trim().split('|');
                const time = args[0]?.trim() || '0 นาที';
                const reason = args[1]?.trim() || 'ไม่ระบุเหตุผล';
        
                const maintenanceEmbed = new EmbedBuilder()
                    .setTitle('🛠️ ประกาศปิดปรับปรุงระบบ')
                    .setColor('#ff0000')
                    .setDescription(
                        '```diff\n' +
                        '- ระบบจะปิดปรับปรุงชั่วคราว\n' +
                        '```\n' +
                        `⏰ ระยะเวลา: ${time}\n` +
                        `📝 เหตุผล: ${reason}\n\n` +
                        '🙏 ขออภัยในความไม่สะดวก'
                    )
                    .setTimestamp()
                    .setFooter({ 
                        text: `ประกาศโดย ${message.author.tag}`,
                        iconURL: message.author.displayAvatarURL()
                    });
        
                // ส่งไปยังทุก Channel ที่กำหนด
                const announceChannels = [
                    process.env.ANNOUNCE_CHANNEL_ID,
                ];
        
                const sentMessages = [];
                for (const channelId of announceChannels) {
                    const channel = client.channels.cache.get(channelId);
                    if (channel) {
                        const sent = await channel.send({ embeds: [maintenanceEmbed] });
                        sentMessages.push(sent);
                    }
                }
        
                // สร้างปุ่มควบคุม
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('maintenance_cancel')
                            .setLabel('❌ ยกเลิกการปรับปรุง')
                            .setStyle('Danger'),
                        new ButtonBuilder()
                            .setCustomId('maintenance_complete')
                            .setLabel('✅ เสร็จสิ้นการปรับปรุง')
                            .setStyle('Success')
                    );
        
                // ส่ง DM พร้อมปุ่มควบคุม
                const controlEmbed = new EmbedBuilder()
                    .setTitle('🎮 ควบคุมการปรับปรุงระบบ')
                    .setColor('#0099ff')
                    .setDescription(
                        '**สถานะปัจจุบัน:** กำลังปรับปรุง\n' +
                        `⏰ เวลาที่แจ้ง: ${time}\n` +
                        `📝 เหตุผล: ${reason}\n\n` +
                        '**การควบคุม:**\n' +
                        '• กด ❌ เพื่อยกเลิกการปรับปรุง\n' +
                        '• กด ✅ เพื่อประกาศเสร็จสิ้น'
                    );
        
                const dm = await message.author.send({
                    embeds: [controlEmbed],
                    components: [buttons]
                });
        
                // เก็บข้อมูลสำหรับการจัดการปุ่ม
                const maintenanceData = {
                    announceMessages: sentMessages,
                    time: time,
                    reason: reason,
                    authorId: message.author.id
                };
        
                // สร้าง collector สำหรับปุ่ม
                const collector = dm.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 24 * 60 * 60 * 1000 // 24 ชั่วโมง
                });
        
                collector.on('collect', async i => {
                    if (i.customId === 'maintenance_cancel') {
                        const cancelEmbed = new EmbedBuilder()
                            .setTitle('🚫 ยกเลิกการปรับปรุงระบบ')
                            .setColor('#ffff00')
                            .setDescription(
                                '```diff\n' +
                                '+ การปรับปรุงระบบถูกยกเลิก\n' +
                                '```\n' +
                                '⚡ ระบบกลับมาใช้งานได้ตามปกติ'
                            )
                            .setTimestamp();
        
                        // อัพเดททุก channel
                        for (const msg of maintenanceData.announceMessages) {
                            await msg.reply({ embeds: [cancelEmbed] });
                        }
        
                        await i.update({ 
                            embeds: [controlEmbed.setDescription('**สถานะ:** ยกเลิกการปรับปรุง ✅')],
                            components: [] 
                        });
                    }
                    else if (i.customId === 'maintenance_complete') {
                        const completeEmbed = new EmbedBuilder()
                            .setTitle('✅ การปรับปรุงระบบเสร็จสิ้น')
                            .setColor('#00ff00')
                            .setDescription(
                                '```diff\n' +
                                '+ การปรับปรุงระบบเสร็จสมบูรณ์\n' +
                                '```\n' +
                                '⚡ ระบบกลับมาใช้งานได้ตามปกติ'
                            )
                            .setTimestamp();
        
                        // อัพเดททุก channel
                        for (const msg of maintenanceData.announceMessages) {
                            await msg.reply({ embeds: [completeEmbed] });
                        }
        
                        await i.update({ 
                            embeds: [controlEmbed.setDescription('**สถานะ:** เสร็จสิ้นการปรับปรุง ✅')],
                            components: [] 
                        });
                    }
                });
        
                message.reply('✅ ส่งประกาศปิดปรับปรุงเรียบร้อยแล้ว! กรุณาตรวจสอบ DM เพื่อควบคุมการประกาศ');
        
            } catch (error) {
                console.error('Error in maintenance command:', error);
                message.reply('❌ เกิดข้อผิดพลาดในการส่งประกาศ');
            }
        }
    })
        
  };