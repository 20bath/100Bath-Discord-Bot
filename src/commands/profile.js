const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const EconomySystem = require("../utils/economySystem");
const WorkSystem = require("../utils/workSystem"); // Add this line
const achievement = require('../utils/achievementSystem'); // Add at the top

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



// Add this function to create embed pages
async function createDetailedProfilePages(profile, targetUser, winRate, netGambling, achievementStats) {
  const pages = [];

  function getRobStats(profile) {
    return {
        asRobber: {
            attempts: profile?.stats?.robStats?.asRobber?.attempts || 0,
            successful: profile?.stats?.robStats?.asRobber?.successful || 0,
            failed: profile?.stats?.robStats?.asRobber?.failed || 0,
            blocked: profile?.stats?.robStats?.asRobber?.blocked || 0,
            totalStolen: profile?.stats?.robStats?.asRobber?.totalStolen || 0,
            highestStolen: profile?.stats?.robStats?.asRobber?.highestStolen || 0,
            totalFines: profile?.stats?.robStats?.asRobber?.totalFines || 0
        },
        asVictim: {
            timesTargeted: profile?.stats?.robStats?.asVictim?.timesTargeted || 0,
            timesRobbed: profile?.stats?.robStats?.asVictim?.timesRobbed || 0,
            timesSaved: profile?.stats?.robStats?.asVictim?.timesSaved || 0,
            totalLost: profile?.stats?.robStats?.asVictim?.totalLost || 0,
            highestLost: profile?.stats?.robStats?.asVictim?.highestLost || 0
        },
        asDefender: {
            blocksAttempted: profile?.stats?.robStats?.asDefender?.blocksAttempted || 0,
            blocksSuccessful: profile?.stats?.robStats?.asDefender?.blocksSuccessful || 0,
            peopleSaved: profile?.stats?.robStats?.asDefender?.peopleSaved || 0,
            moneySaved: profile?.stats?.robStats?.asDefender?.moneySaved || 0
        }
    };
}

const robStats = getRobStats(profile);
  
  // Page 1: Basic Info & Financial
  pages.push(new EmbedBuilder()
      .setTitle(`📊 โปรไฟล์แบบละเอียดของ ${targetUser.username} (1/3)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor("#0099ff")
      .addFields(
          {
              name: "💵 ข้อมูลการเงิน",
              value:
                  `ยอดเงินปัจจุบัน: ${profile.balance.toLocaleString()} บาท\n` +
                  `ยอดเงินในธนาคาร: ${profile.bankBalance.toLocaleString()} บาท\n` +
                  `รายได้ทั้งหมด: ${profile.stats.totalEarned.toLocaleString()} บาท\n` +
                  `รายจ่ายทั้งหมด: ${profile.stats.totalLost.toLocaleString()} บาท`,
              inline: false,
          },
          {
              name: "👔 สถิติการทำงานและอาชีพ",
              value: await generateJobStats(targetUser.id),
              inline: false,
          },
          {
              name: "🎲 สถิติการพนัน",
              value:
                  `เล่นทั้งหมด: ${profile.stats.gamblingStats.gamesPlayed.toLocaleString()} ครั้ง\n` +
                  `ชนะ: ${profile.stats.gamblingStats.won.toLocaleString()} ครั้ง (${winRate}%)\n` +
                  `กำไร/ขาดทุนสุทธิ: ${netGambling.toLocaleString()} บาท`,
              inline: false,
          }
      ));

  // Page 2: Rob Stats
  pages.push(new EmbedBuilder()
      .setTitle(`📊 สถิติการปล้นของ ${targetUser.username} (2/3)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor("#ff6b6b")
      .addFields(
        {
          name: "🦹 สถิติการเป็นโจร",
          value:
              `・พยายามปล้น: ${robStats.asRobber.attempts.toLocaleString()} ครั้ง\n` +
              `・ปล้นสำเร็จ: ${robStats.asRobber.successful.toLocaleString()} ครั้ง\n` +
              `・ปล้นล้มเหลว: ${robStats.asRobber.failed.toLocaleString()} ครั้ง\n` +
              `・โดนขัดขวาง: ${robStats.asRobber.blocked.toLocaleString()} ครั้ง\n` +
              `・ปล้นได้เงินทั้งหมด: ${robStats.asRobber.totalStolen.toLocaleString()} บาท\n` +
              `・ปล้นได้สูงสุด: ${robStats.asRobber.highestStolen.toLocaleString()} บาท\n` +
              `・เสียค่าปรับทั้งหมด: ${robStats.asRobber.totalFines.toLocaleString()} บาท`,
          inline: false
      },
      {
          name: "🎯 สถิติการโดนปล้น",
          value:
              `・โดนพยายามปล้น: ${robStats.asVictim.timesTargeted.toLocaleString()} ครั้ง\n` +
              `・โดนปล้นสำเร็จ: ${robStats.asVictim.timesRobbed.toLocaleString()} ครั้ง\n` +
              `・รอดจากการปล้น: ${robStats.asVictim.timesSaved.toLocaleString()} ครั้ง\n` +
              `・เสียเงินทั้งหมด: ${robStats.asVictim.totalLost.toLocaleString()} บาท\n` +
              `・เสียเงินสูงสุด: ${robStats.asVictim.highestLost.toLocaleString()} บาท`,
          inline: false
      },
      {
          name: "🛡️ สถิติการขัดขวาง",
          value:
              `・พยายามขัดขวาง: ${robStats.asDefender.blocksAttempted.toLocaleString()} ครั้ง\n` +
              `・ขัดขวางสำเร็จ: ${robStats.asDefender.blocksSuccessful.toLocaleString()} ครั้ง\n` +
              `・ช่วยผู้เล่น: ${robStats.asDefender.peopleSaved.toLocaleString()} คน\n` +
              `・ปกป้องเงิน: ${robStats.asDefender.moneySaved.toLocaleString()} บาท`,
          inline: false
      }
      ));

  // Page 3: Transfer Stats & Achievements
  pages.push(new EmbedBuilder()
      .setTitle(`📊 สถิติอื่นๆ ของ ${targetUser.username} (3/3)`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor("#51cf66")
      .addFields(
          {
              name: "💸 สถิติการโอนเงิน",
              value:
                  `**การส่ง**\n` +
                  `• จำนวนครั้ง: ${profile.stats.transferStats.sent.count.toLocaleString()} ครั้ง\n` +
                  `• มูลค่ารวม: ${profile.stats.transferStats.sent.total.toLocaleString()} บาท\n` +
                  `• โอนสูงสุด: ${profile.stats.transferStats.sent.largest.toLocaleString()} บาท\n\n` +
                  `**การรับ**\n` +
                  `• จำนวนครั้ง: ${profile.stats.transferStats.received.count.toLocaleString()} ครั้ง\n` +
                  `• มูลค่ารวม: ${profile.stats.transferStats.received.total.toLocaleString()} บาท`,
              inline: false
          },
          {
              name: '🏆 ความสำเร็จ',
              value: `ผ่าน ${achievementStats.earned}/${achievementStats.total} รายการ\n` +
                     (profile.achievements && profile.achievements.length > 0 
                      ? profile.achievements.slice(0, 5).map(id => {
                          const ach = achievement.achievements[id];
                          return `${ach.icon} **${ach.name}**`;
                        }).join('\n')
                      : 'ยังไม่มีความสำเร็จ'),
              inline: false
          }
      ));

  return pages;
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

      // Add achievement stats
      const achievementStats = await achievement.getAchievementStats(targetUser.id);

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
            },
            {
              name: '🏆 ความสำเร็จ',
              value: `ผ่าน ${achievementStats.earned}/${achievementStats.total} รายการ`,
              inline: false
            }
          )
          .setFooter({
            text: "💡 ใช้ /profile mode:ละเอียด เพื่อดูข้อมูลเพิ่มเติม",
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        const pages = await createDetailedProfilePages(profile, targetUser, winRate, netGambling, achievementStats);
        let currentPage = 0;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.reply({
            embeds: [pages[currentPage]],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'previous') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'next') {
                currentPage = Math.min(pages.length - 1, currentPage + 1);
            }

            // Update button states
            row.components[0].setDisabled(currentPage === 0);
            row.components[1].setDisabled(currentPage === pages.length - 1);

            await i.update({
                embeds: [pages[currentPage]],
                components: [row]
            });
        });

        collector.on('end', () => {
            row.components.forEach(button => button.setDisabled(true));
            interaction.editReply({ components: [row] });
        });
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
