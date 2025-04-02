const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const WorkSystem = require("../utils/workSystem");
const EconomySystem = require("../utils/economySystem");
const levelSystem = require("../utils/levelSystem");

module.exports = {
  data: (() => {
    const command = new SlashCommandBuilder()
      .setName("work")
      .setDescription("ระบบการทำงาน")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("start")
          .setDescription("เริ่มทำงาน")
          .addStringOption((option) => {
            const jobOption = option
              .setName("job")
              .setDescription("เลือกอาชีพที่ต้องการทำงาน")
              .setRequired(true);

            // เพิ่ม choices แบบ Dynamic จาก WorkSystem
            const jobs = WorkSystem.getJobChoices();
            jobs.forEach((job) => {
              jobOption.addChoices(job);
            });

            return jobOption;
          })
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("info").setDescription("ดูข้อมูลอาชีพทั้งหมด")
      );

    return command;
  })(),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "info") {
        const userLevel = await levelSystem.getLevel(interaction.user.id);
        const embed = new EmbedBuilder()
          .setTitle("💼 รายชื่ออาชีพทั้งหมด")
          .setColor("#0099ff")
          .setDescription("รายละเอียดอาชีพที่สามารถทำได้:");

        for (const job of WorkSystem.getJobs()) {
          const jobLevel = await WorkSystem.getJobLevel(
            interaction.user.id,
            job.id
          );
          const isLocked = job.requiredLevel > userLevel;

          embed.addFields({
            name: `${isLocked ? "🔒" : "✅"} ${job.name}`,
            value:
              `ต้องการเลเวล: ${job.requiredLevel}\n` +
              `เลเวลอาชีพปัจจุบัน: ${jobLevel}\n` +
              `รายได้พื้นฐาน: ${job.pay.base} บาท\n` +
              `EXP พื้นฐาน: ${job.exp.base}\n` +
              `⏰ คูลดาวน์: ${job.cooldown / 60000} นาที\n` +
              `ไอเทมพิเศษ: ${job.items.map((item) => item.name).join(", ")}`,
            inline: false,
          });
        }

        embed.setFooter({
          text: `เลเวลปัจจุบันของคุณ: ${userLevel}`,
        });

        return interaction.editReply({ embeds: [embed] });
      }

      // ส่วนของการทำงาน
      const jobId = interaction.options.getString("job");
      const job = WorkSystem.jobs.find((j) => j.id === jobId);

      if (!job) {
        return interaction.editReply({
          content: "❌ ไม่พบอาชีพที่ระบุ",
          ephemeral: true,
        });
      }

      // ตรวจสอบ cooldown
      const jobCooldown = await WorkSystem.checkJobCooldown(
        interaction.user.id,
        jobId
      );
      if (jobCooldown > 0) {
        const minutes = Math.floor(jobCooldown / 60000);
        const seconds = Math.floor((jobCooldown % 60000) / 1000);

        return interaction.editReply({
          content: `⏰ คุณเพิ่งทำงาน ${job.name} กรุณารอ ${
            minutes > 0 ? `${minutes} นาที ` : ""
          }${seconds} วินาที`,
          flags: ["Ephemeral"],
        });
      }

      // เริ่มการทำงาน
      const result = await WorkSystem.work(interaction.user, jobId);

      if (!result.success) {
        const errorMessages = {
          level_too_low: "❌ เลเวลของคุณยังไม่พอสำหรับอาชีพนี้",
          invalid_job: "❌ ไม่พบอาชีพที่ระบุ",
          system_error: "❌ เกิดข้อผิดพลาดในระบบ",
        };
        return interaction.editReply({
          content:
            errorMessages[result.reason] || "❌ เกิดข้อผิดพลาดในการทำงาน",
          flags: ["Ephemeral"],
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("💼 ทำงานสำเร็จ!")
        .setColor("#00ff00")
        .addFields(
          {
            name: "👔 อาชีพ",
            value: `${result.job} (Lv.${result.jobLevel})`,
            inline: true,
          },
          {
            name: "💰 รายได้",
            value: `${result.amount} บาท`,
            inline: true,
          },
          {
            name: "⭐ EXP",
            value: `+${result.exp} EXP`,
            inline: true,
          }
        )
        .setFooter({
          text: `ยอดเงินคงเหลือ: ${result.newBalance} บาท`,
        })
        .setTimestamp();

      // แสดงไอเทมที่ได้รับ (ถ้ามี)
      if (result.items) {
        embed.addFields({
          name: "🎁 ได้รับไอเทมพิเศษ",
          value: result.items
            .map((item) => `${item.name} (${item.value} บาท)`)
            .join("\n"),
          inline: false,
        });
      }

      // แสดงเพชรที่ได้รับ (ถ้ามี)
      if (result.gems && result.gems.length > 0) {
        // Group gems by type and count
        const gemCounts = result.gems.reduce((acc, gem) => {
          if (!acc[gem.type]) {
            acc[gem.type] = {
              name: gem.name,
              count: 0,
            };
          }
          acc[gem.type].count++;
          return acc;
        }, {});

        embed.addFields({
          name: "💎 ได้รับเพชร",
          value: Object.values(gemCounts)
            .map((gem) => `${gem.name} (ได้รับ ${gem.count} เม็ด)`)
            .join("\n"),
          inline: false,
        });
      }
      
      // Get user profile to access dailyGemsEarned
      const userProfile = await EconomySystem.getProfile(interaction.user.id);
      
      // Add to work command embed
      embed.addFields({
        name: "💎 เพชรที่ได้วันนี้",
        value: `${userProfile.dailyGemsEarned}/${WorkSystem.GEM_CONFIG.DAILY_LIMIT}`,
        inline: true
      });

      if (userProfile.dailyGemsEarned >= WorkSystem.GEM_CONFIG.DAILY_LIMIT) {
        embed.addFields({
          name: "⚠️ แจ้งเตือน",
          value: "คุณได้รับเพชรถึงขีดจำกัดของวันนี้แล้ว",
          inline: false
        });
      }

      // แสดงการเลเวลอัพของอาชีพ (ถ้ามี)
      if (result.levelUp) {
        embed.addFields({
          name: "🎉 เลเวลอัพ!",
          value: `เลเวลอาชีพเพิ่มขึ้นเป็น ${result.jobLevel + 1}`,
          inline: false,
        });
      }

      await WorkSystem.setJobCooldown(interaction.user.id, jobId, job.cooldown);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in work command:", error);
      if (interaction.deferred) {
        return interaction.editReply({
          content: "❌ เกิดข้อผิดพลาดในการทำงาน",
          ephemeral: true,
        });
      }
      return interaction.editReply({
        content: "❌ เกิดข้อผิดพลาดในการทำงาน",
        ephemeral: true,
      });
    }
  },
};
