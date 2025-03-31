const {
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'click_me') {
      await interaction.reply({
        content: '🎉 คุณได้กดปุ่มแล้ว!'
      });
    }
  });

  client.on("messageCreate", async (message) => {
    if (
      !message.guild ||
      !message.member?.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

      if (message.content === "!button") {
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("click_me")
              .setLabel("Click me")
              .setStyle(ButtonStyle.Primary)
          );
  
        await message.channel.send({
          content: "Click the button below!",
          components: [row],
        });
      }

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

    // !maintenance ระยะเวลา | เหตุผล
    // !maintenance 30 นาที | อัพเดทระบบการพนัน

    // คำสั่งสำหรับประกาศปิดปรับปรุง
    if (message.content.startsWith("!maintenance")) {
      try {
        const args = message.content
          .slice("!maintenance".length)
          .trim()
          .split("|");
        const time = args[0]?.trim() || "0 นาที";
        const reason = args[1]?.trim() || "ไม่ระบุเหตุผล";

        const maintenanceEmbed = new EmbedBuilder()
          .setTitle("🛠️ ประกาศปิดปรับปรุงระบบ")
          .setColor("#ff0000")
          .setDescription(
            "```diff\n" +
              "- ระบบจะปิดปรับปรุงชั่วคราว\n" +
              "```\n" +
              `⏰ ระยะเวลา: ${time}\n` +
              `📝 เหตุผล: ${reason}\n\n` +
              "🙏 ขออภัยในความไม่สะดวก"
          )
          .setTimestamp()
          .setFooter({
            text: `ประกาศโดย ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          });

        // ส่งไปยังทุก Channel ที่กำหนด
        const announceChannels = [process.env.ANNOUNCE_CHANNEL_ID];

        const sentMessages = [];
        for (const channelId of announceChannels) {
          const channel = client.channels.cache.get(channelId);
          if (channel) {
            const sent = await channel.send({
              content: "@everyone", // Add @everyone mention
              embeds: [maintenanceEmbed],
              allowedMentions: { parse: ["everyone"] }, // Enable @everyone mention
            });
            sentMessages.push(sent);
          }
        }

        // สร้างปุ่มควบคุม
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("maintenance_cancel")
            .setLabel("❌ ยกเลิกการปรับปรุง")
            .setStyle("Danger"),
          new ButtonBuilder()
            .setCustomId("maintenance_complete")
            .setLabel("✅ เสร็จสิ้นการปรับปรุง")
            .setStyle("Success")
        );

        // ส่ง DM พร้อมปุ่มควบคุม
        const controlEmbed = new EmbedBuilder()
          .setTitle("🎮 ควบคุมการปรับปรุงระบบ")
          .setColor("#0099ff")
          .setDescription(
            "**สถานะปัจจุบัน:** กำลังปรับปรุง\n" +
              `⏰ เวลาที่แจ้ง: ${time}\n` +
              `📝 เหตุผล: ${reason}\n\n` +
              "**การควบคุม:**\n" +
              "• กด ❌ เพื่อยกเลิกการปรับปรุง\n" +
              "• กด ✅ เพื่อประกาศเสร็จสิ้น"
          );

        const dm = await message.author.send({
          embeds: [controlEmbed],
          components: [buttons],
        });

        // เก็บข้อมูลสำหรับการจัดการปุ่ม
        const maintenanceData = {
          announceMessages: sentMessages,
          time: time,
          reason: reason,
          authorId: message.author.id,
        };

        // สร้าง collector สำหรับปุ่ม
        const collector = dm.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 24 * 60 * 60 * 1000, // 24 ชั่วโมง
        });

        collector.on("collect", async (i) => {
          if (i.customId === "maintenance_cancel") {
            const cancelEmbed = new EmbedBuilder()
              .setTitle("🚫 ยกเลิกการปรับปรุงระบบ")
              .setColor("#ffff00")
              .setDescription(
                "```diff\n" +
                  "+ การปรับปรุงระบบถูกยกเลิก\n" +
                  "```\n" +
                  "⚡ ระบบกลับมาใช้งานได้ตามปกติ"
              )
              .setTimestamp();

            // อัพเดททุก channel
            for (const msg of maintenanceData.announceMessages) {
              await msg.reply({ embeds: [cancelEmbed] });
            }

            await i.update({
              embeds: [
                controlEmbed.setDescription("**สถานะ:** ยกเลิกการปรับปรุง ✅"),
              ],
              components: [],
            });
          } else if (i.customId === "maintenance_complete") {
            const completeEmbed = new EmbedBuilder()
              .setTitle("✅ การปรับปรุงระบบเสร็จสิ้น")
              .setColor("#00ff00")
              .setDescription(
                "```diff\n" +
                  "+ การปรับปรุงระบบเสร็จสมบูรณ์\n" +
                  "```\n" +
                  "⚡ ระบบกลับมาใช้งานได้ตามปกติ"
              )
              .setTimestamp();

            // อัพเดททุก channel
            for (const msg of maintenanceData.announceMessages) {
              await msg.reply({ embeds: [completeEmbed] });
            }

            await i.update({
              embeds: [
                controlEmbed.setDescription(
                  "**สถานะ:** เสร็จสิ้นการปรับปรุง ✅"
                ),
              ],
              components: [],
            });
          }
        });

        message.reply(
          "✅ ส่งประกาศปิดปรับปรุงเรียบร้อยแล้ว! กรุณาตรวจสอบ DM เพื่อควบคุมการประกาศ"
        );
      } catch (error) {
        console.error("Error in maintenance command:", error);
        message.reply("❌ เกิดข้อผิดพลาดในการส่งประกาศ");
      }
    }

    // พิมพ์คำสั่ง !announce #channel | type | หัวข้อ | ข้อความ
    // !announce #announcements | update | อัพเดทระบบใหม่ | - เพิ่มระบบธนาคาร\n- เพิ่มระบบดอกเบี้ย\n- ปรับปรุงระบบการพนัน
    // Add after the maintenance command

    // Update the announce command
    if (message.content.startsWith("!announce")) {
      try {
        // Format: !announce #channel | type | Title | Message
        const args = message.content
          .slice("!announce".length)
          .trim()
          .split("|");
        const channelMention = args[0]?.trim();
        const type = args[1]?.trim().toLowerCase() || "update"; // default to update
        const title = args[2]?.trim() || "ประกาศอัพเดท";
        const content = args[3]?.trim() || "ไม่มีรายละเอียด";

        // Get channel ID from mention
        const channelId = channelMention.replace(/<#|>/g, "");
        const channel = message.guild.channels.cache.get(channelId);

        if (!channel) {
          return message.reply(
            "❌ ไม่พบช่องที่ระบุ กรุณาใช้รูปแบบ `!announce #channel | type | หัวข้อ | ข้อความ`\n" +
              "Types: bug (🔴), update (🟢), system (🔵)"
          );
        }

        // Define announcement types and their properties
        const types = {
          bug: {
            color: "#ff0000",
            emoji: "🐛",
            prefix: "แก้ไขข้อผิดพลาด",
            diffPrefix: "-",
          },
          update: {
            color: "#00ff00",
            emoji: "🎉",
            prefix: "อัพเดทระบบใหม่",
            diffPrefix: "+",
          },
          system: {
            color: "#0099ff",
            emoji: "⚙️",
            prefix: "ปรับปรุงระบบ",
            diffPrefix: "*",
          },
        };

        // Get announcement type properties
        const announceType = types[type] || types.update;

        const announceEmbed = new EmbedBuilder()
          .setTitle(`${announceType.emoji} ${announceType.prefix}!`)
          .setColor(announceType.color)
          .setDescription(
            "```diff\n" +
              `${announceType.diffPrefix} ${title}\n` +
              "```\n" +
              "📝 **รายละเอียด:**\n" +
              content
          )
          .setTimestamp()
          .setFooter({
            text: `ประกาศโดย ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL(),
          });

        // Add confirm/cancel buttons with type indication
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("announce_confirm")
            .setLabel(`✅ ส่งประกาศ ${announceType.emoji}`)
            .setStyle("Success"),
          new ButtonBuilder()
            .setCustomId("announce_cancel")
            .setLabel("❌ ยกเลิก")
            .setStyle("Danger")
        );

        // Send preview message with type helper
        const preview = await message.channel.send({
          content: `**📢 ตัวอย่างประกาศ: ${announceType.prefix}**`,
          embeds: [announceEmbed],
          components: [buttons],
        });

        // Create collector for buttons
        const collector = preview.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 60000, // 1 minute
        });

        collector.on("collect", async (i) => {
          if (i.customId === "announce_confirm") {
            // Send announcement to specified channel
            // Send announcement to specified channel with @everyone
            await channel.send({
              content: "@everyone", // Add @everyone mention
              embeds: [announceEmbed],
              allowedMentions: { parse: ["everyone"] }, // Enable @everyone mention
            });
            await i.update({
              content: "✅ ส่งประกาศเรียบร้อยแล้ว!",
              embeds: [announceEmbed],
              components: [],
            });
          } else if (i.customId === "announce_cancel") {
            await i.update({
              content: "❌ ยกเลิกการประกาศ",
              embeds: [],
              components: [],
            });
          }
        });

        collector.on("end", (collected) => {
          if (collected.size === 0) {
            preview.edit({
              content: "⏰ หมดเวลาในการยืนยัน",
              components: [],
            });
          }
        });
      } catch (error) {
        console.error("Error in announce command:", error);
        message.reply(
          "❌ เกิดข้อผิดพลาดในการส่งประกาศ กรุณาใช้รูปแบบ\n" +
            "`!announce #channel | type | หัวข้อ | ข้อความ`\n" +
            "Types: bug (🔴), update (🟢), system (🔵)"
        );
      }
    }

    if (message.content === "!button") {
      // ใช้คำสั่ง !button เพื่อสร้างปุ่ม
      // สร้างปุ่มที่ให้ผู้ใช้กด
      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("click_me") // ชื่อของปุ่มนี้
          .setLabel("Click me") // ข้อความบนปุ่ม
          .setStyle("PRIMARY") // สีของปุ่ม
      );

      // ส่งข้อความพร้อมกับปุ่ม
      await message.channel.send({
        content: "Click the button below!",
        components: [row],
      });
    }
  });
};
