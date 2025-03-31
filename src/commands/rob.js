const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const EconomySystem = require("../utils/economySystem");
const shop = require("../utils/shopSystem");
const { activeRobs, ROB_CONFIG } = require("../utils/robSystem"); // Move to separate system file
const QuestSystem = require("../utils/questDailySystem"); // Add this import

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("ปล้นเงินจากผู้เล่นอื่น")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("ผู้เล่นที่ต้องการปล้น")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const robber = interaction.user;
      const target = interaction.options.getUser("target");

      if (robber.id === target.id)
        return interaction.editReply({
          content: "❌ คุณไม่สามารถปล้นตัวเองได้",
          ephemeral: true,
        });
      if (target.bot)
        return interaction.editReply({
          content: "❌ คุณไม่สามารถปล้นบอทได้",
          ephemeral: true,
        });

      const cooldown = await EconomySystem.checkCooldown(robber.id, "rob");
      if (cooldown > 0) {
        const minutes = Math.ceil(cooldown / 60000);
        return interaction.editReply({
          content: `⏰ ต้องรอ ${minutes} นาที ก่อนปล้นอีกครั้ง`,
          ephemeral: true,
        });
      }

      const targetProfile = await EconomySystem.getProfile(target.id);
      if (targetProfile.balance < ROB_CONFIG.MIN_MONEY_TO_ROB)
        return interaction.editReply({
          content: "❌ เป้าหมายมีเงินน้อยเกินไป",
          ephemeral: true,
        });

      // Check if already being robbed
      if (activeRobs.has(target.id)) {
        return interaction.editReply({
          content: "🚨 ผู้เล่นนี้กำลังถูกปล้นอยู่!",
          ephemeral: true,
        });
      }

      // คำนวณค่าต่างๆที่จำเป็นก่อน
      const robberProfile = await EconomySystem.getProfile(robber.id);
      const maxSteal = Math.floor(
        targetProfile.balance * (ROB_CONFIG.MAX_STEAL_PERCENT / 100)
      );
      const stealAmount = Math.floor(Math.random() * maxSteal) + 1;
      const effects = await shop.checkEffects(robber.id);
      const robSuccess = effects.success_rob_rate || 0;
      const success =
        Math.random() * 100 < ROB_CONFIG.SUCCESS_RATE + robSuccess * 100;

      // Update robbery attempt stats
      await EconomySystem.updateProfile(robber.id, {
        "stats.robStats.asRobber.attempts":
          (robberProfile.stats?.robStats?.asRobber?.attempts || 0) + 1,
      });

      await EconomySystem.updateProfile(target.id, {
        "stats.robStats.asVictim.timesTargeted":
          (targetProfile.stats?.robStats?.asVictim?.timesTargeted || 0) + 1,
      });

      // คำนวณเงินที่ตกหล่น
      const droppedAmount =
        Math.random() < ROB_CONFIG.DROP_CHANCE
          ? Math.floor(
              (stealAmount *
                (Math.random() *
                  (ROB_CONFIG.DROP_PERCENT.MAX - ROB_CONFIG.DROP_PERCENT.MIN) +
                  ROB_CONFIG.DROP_PERCENT.MIN)) /
                100
            )
          : 0;

      const finalStealAmount = stealAmount - droppedAmount;

      // Announce robbery event
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`block_rob_${target.id}`)
          .setLabel("🛡️ ขัดขวางการปล้น!")
          .setStyle(ButtonStyle.Danger)
      );

      const announceEmbed = new EmbedBuilder()
        .setTitle("🦹 มีการปล้นเกิดขึ้น!")
        .setColor("#ff0000")
        .setDescription(
          `
              🔴 **LIVE**: การปล้นกำลังดำเนินการ!
              
              👤 **โจร**: ${robber.username}
              🎯 **เป้าหมาย**: ${target.username}
              
              ⚠️ **สมาชิกทุกคนสามารถกดปุ่มด้านล่างเพื่อขัดขวางการปล้นได้**
          `
        )
        .addFields({
          name: "⏳ เวลาที่เหลือ",
          value: "`10 วินาที`",
          inline: true,
        })
        .setTimestamp()
        .setFooter({
          text: "💡 กดปุ่มด้านล่างเพื่อขัดขวางการปล้น",
        });

      await interaction.editReply({
        content: "@everyone มีการปล้นเกิดขึ้น! มาช่วยกันขัดขวางพวกโจรชั่วกัน !",
        embeds: [announceEmbed],
        components: [row],
        allowedMentions: { parse: ["everyone"] },
      });

      // Send DM to target if robbery will be successful
      if (success) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle("⚠️ คุณถูกปล้น!")
            .setColor("#ff0000")
            .setDescription(`${robber.username} ได้ปล้นเงินของคุณ!`)
            .addFields(
              {
                name: "💸 จำนวนเงินที่เสีย",
                value: `${stealAmount} บาท`,
                inline: true,
              },
              {
                name: "💰 ยอดเงินคงเหลือ",
                value: `${targetProfile.balance - stealAmount} บาท`,
                inline: true,
              }
            )
            .setFooter({
              text: "💡 แนะนำ: เก็บเงินไว้ในธนาคารเพื่อป้องกันการปล้น",
            })
            .setTimestamp();

          if (droppedAmount > 0) {
            dmEmbed.addFields({
              name: "🌟 โชคดี!",
              value: `โจรทำเงินตกหล่น ${droppedAmount} บาท`,
              inline: false,
            });
          }

          await target.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.error("Error sending DM to robbery target:", error);
        }
      }

      // Start robbery timer (5 seconds)
      const mainTimeout = setTimeout(async () => {
        try {
          // Ensure no one blocked the robbery
          if (!activeRobs.has(target.id)) {
            return; // Robbery was blocked, do nothing
          }

          activeRobs.delete(target.id);

          if (success) {
            await EconomySystem.addMoney(robber.id, finalStealAmount);
            await EconomySystem.addMoney(target.id, -stealAmount);

            // Update robbery success stats
            await EconomySystem.updateProfile(robber.id, {
              "stats.robStats.asRobber.successful":
                (robberProfile.stats?.robStats?.asRobber?.successful || 0) + 1,
              "stats.robStats.asRobber.totalStolen":
                (robberProfile.stats?.robStats?.asRobber?.totalStolen || 0) +
                finalStealAmount,
              "stats.robStats.asRobber.highestStolen": Math.max(
                robberProfile.stats?.robStats?.asRobber?.highestStolen || 0,
                finalStealAmount
              ),
            });

            await EconomySystem.updateProfile(target.id, {
              "stats.robStats.asVictim.timesRobbed":
                (targetProfile.stats?.robStats?.asVictim?.timesRobbed || 0) + 1,
              "stats.robStats.asVictim.totalLost":
                (targetProfile.stats?.robStats?.asVictim?.totalLost || 0) +
                stealAmount,
              "stats.robStats.asVictim.highestLost": Math.max(
                targetProfile.stats?.robStats?.asVictim?.highestLost || 0,
                stealAmount
              ),
            });

            await QuestSystem.updateQuestProgress(
              interaction.user.id,
              "successful_robs",
              1
            );
            const successEmbed = new EmbedBuilder() // เปลี่ยนชื่อตัวแปร
              .setTitle("✅ ปล้นสำเร็จ!")
              .setDescription(
                `คุณปล้น ${target.username} ได้ ${finalStealAmount} บาท`
              )
              .setColor("Green");

            await interaction.editReply({
              embeds: [successEmbed],
              components: [],
            });
          } else {
            const fine = Math.floor(
              stealAmount * (ROB_CONFIG.FINE_PERCENT / 100)
            );
            await EconomySystem.addMoney(robber.id, -fine);

            // Update failed robbery stats
            await EconomySystem.updateProfile(robber.id, {
              "stats.robStats.asRobber.failed":
                (robberProfile.stats?.robStats?.asRobber?.failed || 0) + 1,
              "stats.robStats.asRobber.totalFines":
                (robberProfile.stats?.robStats?.asRobber?.totalFines || 0) +
                fine,
            });

            const failEmbed = new EmbedBuilder() // เปลี่ยนชื่อตัวแปร
              .setTitle("❌ ปล้นล้มเหลว!")
              .setDescription(
                `คุณพยายามปล้น ${target.username} แต่ล้มเหลวและโดนปรับ ${fine} บาท`
              )
              .setColor("Red");

            await interaction.editReply({
              embeds: [failEmbed],
              components: [],
            });
          }
          await EconomySystem.setCooldown(
            robber.id,
            "rob",
            ROB_CONFIG.COOLDOWN
          );
        } catch (error) {
          console.error("Error in robbery timeout:", error);
          await interaction.editReply({
            content: "❌ เกิดข้อผิดพลาดระหว่างการปล้น",
            components: [],
          });
        }
      }, 10000);

      // Save the event so others can cancel
      const cleanupTimeout = setTimeout(() => {
        // Timeout handling
        activeRobs.delete(target.id);
      }, 30000); // 30 second timeout

      activeRobs.set(target.id, {
        robberId: interaction.user.id,
        timeout: cleanupTimeout,
        mainTimeout: mainTimeout, // Add main timeout reference
      });
    } catch (error) {
      console.error("Error in rob command:", error);
      await interaction.editReply({
        content: "❌ เกิดข้อผิดพลาดในการปล้น",
        flags: ["Ephemeral"],
      });
    }
  },
};
