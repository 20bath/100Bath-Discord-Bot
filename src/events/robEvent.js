const { EmbedBuilder } = require("discord.js");
const { activeRobs, ROB_CONFIG, checkRobberyCard } = require("../utils/robSystem");
const EconomySystem = require("../utils/economySystem");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    try {
      if (!interaction.isButton()) return;

      const customId = interaction.customId;
      if (!customId.startsWith("block_rob_")) return;

      const targetId = customId.split("_").pop();

      // Add debug logging
      console.log('Active robs:', activeRobs);
      console.log('Target ID:', targetId);

      const robEvent = activeRobs.get(targetId);

      // ตรวจสอบว่ามีการปล้นที่จะขัดขวางหรือไม่ก่อน
      if (!robEvent) {
        return interaction.reply({
          content: "❌ ไม่มีการปล้นที่สามารถขัดขวางได้",
          ephemeral: true,
        });
      }

      // จากนั้นค่อยตรวจสอบว่าเป็นโจรหรือไม่
      if (interaction.user.id === robEvent.robberId) {
        return interaction.reply({
          content: "❌ คุณไม่สามารถขัดขวางการปล้นของตัวเองได้",
          ephemeral: true,
        });
      }

      // ยกเลิก timeout และลบการปล้นออกจาก activeRobs
      clearTimeout(robEvent.timeout);
      if (robEvent.mainTimeout) {
          clearTimeout(robEvent.mainTimeout);
      }
      activeRobs.delete(targetId);

      // คำนวณค่าปรับ
      const fine = Math.floor(
        Math.random() *
          (ROB_CONFIG.FINE_SYSTEM.BLOCK.MAX -
            ROB_CONFIG.FINE_SYSTEM.BLOCK.MIN +
            1) +
          ROB_CONFIG.FINE_SYSTEM.BLOCK.MIN
      );

      // สร้าง embed แสดงผลการขัดขวาง
      const embed = new EmbedBuilder()
        .setTitle("🛡️ การปล้นถูกขัดขวาง!")
        .setColor("#1E90FF")
        .setDescription(
          `
        ✨ **${interaction.user.username}** ได้ขัดขวางการปล้นสำเร็จ!
        
        👮 **บทลงโทษ**
        โจรถูกปรับเป็นจำนวนเงิน **${fine.toLocaleString()}** บาท
        
        ⚖️ **ความยุติธรรมได้ถูกรักษาไว้!**
      `
        )
        .setTimestamp();

      // อัพเดทข้อความและปิดปุ่ม
      await interaction.update({
        embeds: [embed],
        components: [],
        content: "🛡️ การปล้นถูกขัดขวางแล้ว!",
      });

      // หักเงินค่าปรับจากโจร
      await EconomySystem.addMoney(robEvent.robberId, -fine);

      // Inside the interaction handler:

      const defenderProfile = await EconomySystem.getProfile(interaction.user.id);
      const targetProfile = await EconomySystem.getProfile(targetId);
      const robberProfile = await EconomySystem.getProfile(robEvent.robberId);

      // Update defender stats
      await EconomySystem.updateProfile(interaction.user.id, {
          'stats.robStats.asDefender.blocksAttempted': defenderProfile.stats.robStats.asDefender.blocksAttempted + 1,
          'stats.robStats.asDefender.blocksSuccessful': defenderProfile.stats.robStats.asDefender.blocksSuccessful + 1,
          'stats.robStats.asDefender.peopleSaved': defenderProfile.stats.robStats.asDefender.peopleSaved + 1,
          'stats.robStats.asDefender.moneySaved': defenderProfile.stats.robStats.asDefender.moneySaved + Math.floor(targetProfile.balance * (ROB_CONFIG.MAX_STEAL_PERCENT / 100))
      });

      // Update victim saved stats
      await EconomySystem.updateProfile(targetId, {
          'stats.robStats.asVictim.timesSaved': targetProfile.stats.robStats.asVictim.timesSaved + 1
      });

      // Update robber blocked stats
      await EconomySystem.updateProfile(robEvent.robberId, {
          'stats.robStats.asRobber.blocked': robberProfile.stats.robStats.asRobber.blocked + 1
      });

      // ส่ง DM แจ้งเตือนโจร
      try {
        const robber = await client.users.fetch(robEvent.robberId);
        await robber.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#ff0000")
              .setTitle("⚠️ การปล้นถูกขัดขวาง!")
              .setDescription(
                `**${
                  interaction.user.username
                }** ได้ขัดขวางการปล้นของคุณ!\nคุณถูกปรับ **${fine.toLocaleString()}** บาท`
              )
              .setTimestamp(),
          ],
        });
      } catch (error) {
        console.error("Cannot send DM to robber:", error);
      }
    } catch (error) {
      console.error("Error in rob block event:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ เกิดข้อผิดพลาดในการขัดขวางการปล้น",
          ephemeral: true,
        });
      }
    }
  });
};
