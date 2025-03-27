const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const EconomySystem = require("../utils/economySystem");
const WorkSystem = require("../utils/workSystem"); // Add this line

// Add this function at the bottom of the file (before module.exports)
async function generateJobStats(userId) {
  const jobs = WorkSystem.getJobs();
  const stats = [];

  for (const job of jobs) {
    const jobLevel = await WorkSystem.getJobLevel(userId, job.id);
    const jobExpNeeded = 100 * Math.pow(1.5, jobLevel);
    const profile = await EconomySystem.getProfile(userId);
    const currentJobExp = profile.jobExp?.[job.id] || 0;
    const progressPercent = ((currentJobExp / jobExpNeeded) * 100).toFixed(1);

    // สร้าง Progress Bar
    const progressBar = createProgressBar(currentJobExp, jobExpNeeded, 10);

    // คำนวณโบนัสต่างๆ
    growthPercent = 5; // 5%
    const payBonus = (growthPercent * jobLevel)
    const itemChanceBonus = (growthPercent * jobLevel)

    stats.push(
      `**${job.name}** (Lv.${jobLevel})\n` +
        `┗ EXP: ${progressBar} (${progressPercent}%)\n` +
        `┗ โบนัสรายได้: +${payBonus}%\n` +
        `┗ โบนัสไอเทม: +${itemChanceBonus}%\n`
    );
  }

  return stats.join("\n") || "ยังไม่มีข้อมูลอาชีพ";
}

function createProgressBar(current, max, length) {
  const progress = Math.floor((current / max) * length);
  const emptyProgress = length - progress;
  const progressText = "█".repeat(progress);
  const emptyProgressText = "▒".repeat(emptyProgress);
  return progressText + emptyProgressText;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("ดูข้อมูลโปรไฟล์ทางเศรษฐกิจ")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ผู้เล่นที่ต้องการดูข้อมูล")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("รูปแบบการแสดงผล")
        .addChoices(
          { name: "🔄 ทั่วไป", value: "simple" },
          { name: "📊 ละเอียด", value: "advanced" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const mode = interaction.options.getString("mode") || "simple";
      const profile = await EconomySystem.getProfile(targetUser.id);

      if (!profile) {
        return interaction.reply({
          content: "❌ ไม่พบข้อมูลผู้เล่นนี้",
          flags: ["Ephemeral"],
        });
      }

      // คำนวณสถิติพื้นฐาน
      const netWorth = profile.balance;
      const netGambling =
        profile.stats.gamblingStats.totalEarned -
        profile.stats.gamblingStats.totalLost;
      const winRate =
        profile.stats.gamblingStats.gamesPlayed > 0
          ? (
              (profile.stats.gamblingStats.won /
                profile.stats.gamblingStats.gamesPlayed) *
              100
            ).toFixed(1)
          : 0;

      if (mode === "simple") {
        // โปรไฟล์แบบเรียบง่าย
        const embed = new EmbedBuilder()
          .setTitle(`💰 โปรไฟล์ของ ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setColor("#00ff00")
          .addFields(
            {
              name: "💵 ข้อมูลพื้นฐาน",
              value:
                `ยอดเงิน: ${profile.balance} บาท\n` +
                `ธนาคาร: ${profile.bankBalance} บาท\n` +
                `งานที่ทำ: ${profile.stats.workStats.jobsCompleted} ครั้ง\n` +
                `เล่นพนัน: ${profile.stats.gamblingStats.gamesPlayed} ครั้ง`,
              inline: false,
            },
            {
              name: "📈 สถิติโดยรวม",
              value:
                `รายได้ล่าสุด: ${profile.stats.workStats.lastPaycheck} บาท\n` +
                `อัตราชนะพนัน: ${winRate}%\n` +
                `กำไร/ขาดทุนพนัน: ${netGambling} บาท`,
              inline: false,
            }
          )
          .setFooter({
            text: "💡 ใช้ /profile mode:ละเอียด เพื่อดูข้อมูลเพิ่มเติม",
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        // โปรไฟล์แบบละเอียด
        const embed = new EmbedBuilder()
          .setTitle(`📊 โปรไฟล์แบบละเอียดของ ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setColor("#0099ff")
          .addFields(
            {
              name: "💵 ข้อมูลการเงิน",
              value:
                `ยอดเงินปัจจุบัน: ${profile.balance} บาท\n` +
                `ยอดเงินในธนาคาร: ${profile.bankBalance} บาท\n` +
                `รายได้ทั้งหมด: ${profile.stats.totalEarned} บาท\n` +
                `รายจ่ายทั้งหมด: ${profile.stats.totalLost} บาท`,
              inline: false,
            },
            {
              name: "👔 สถิติการทำงาน",
              value:
                `จำนวนครั้งที่ทำงาน: ${profile.stats.workStats.jobsCompleted} ครั้ง\n` +
                `รายได้จากการทำงาน: ${profile.stats.workStats.totalWorked} บาท\n` +
                `เงินเดือนล่าสุด: ${profile.stats.workStats.lastPaycheck} บาท`,
              inline: false,
            },
            {
              name: "👔 ข้อมูลอาชีพ",
              value: await generateJobStats(targetUser.id),
              inline: false,
            },
            {
              name: "🎲 สถิติการพนัน",
              value:
                `เล่นทั้งหมด: ${profile.stats.gamblingStats.gamesPlayed} ครั้ง\n` +
                `ชนะ: ${profile.stats.gamblingStats.won} ครั้ง (${winRate}%)\n` +
                `แพ้: ${profile.stats.gamblingStats.lost} ครั้ง\n` +
                `ชนะสูงสุด: ${profile.stats.gamblingStats.biggestWin} บาท\n` +
                `แพ้สูงสุด: ${profile.stats.gamblingStats.biggestLoss} บาท\n` +
                `กำไร/ขาดทุนสุทธิ: ${netGambling} บาท`,
              inline: false,
            },
            {
              name: "💸 สถิติการโอนเงิน",
              value:
                `**การส่ง**\n` +
                `• จำนวนครั้ง: ${profile.stats.transferStats.sent.count} ครั้ง\n` +
                `• มูลค่ารวม: ${profile.stats.transferStats.sent.total} บาท\n` +
                `• โอนสูงสุด: ${profile.stats.transferStats.sent.largest} บาท\n` +
                `• ค่าธรรมเนียมรวม: ${profile.stats.transferStats.sent.fees} บาท\n\n` +
                `**การรับ**\n` +
                `• จำนวนครั้ง: ${profile.stats.transferStats.received.count} ครั้ง\n` +
                `• มูลค่ารวม: ${profile.stats.transferStats.received.total} บาท\n` +
                `• รับสูงสุด: ${profile.stats.transferStats.received.largest} บาท`,
              inline: false,
            }
          )
          .setFooter({
            text: `เริ่มเล่นเมื่อ: ${new Date(profile.createdAt).toLocaleString(
              "th-TH"
            )}`,
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Error in profile command:", error);
      await interaction.reply({
        content: "❌ เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์",
        flags: ["Ephemeral"],
      });
    }
  },
};
