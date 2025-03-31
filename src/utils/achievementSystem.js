const { EmbedBuilder } = require("discord.js");
const economy = require("./economySystem");

class AchievementSystem {
  constructor() {
    this.achievements = {
      // การเงิน
      first_million: {
        id: "first_million",
        name: "💰 เศรษฐีหน้าใหม่",
        description: "มีเงินในธนาคารครบ 1,000,000 บาท",
        icon: "💰",
        condition: (profile) => profile.bankBalance >= 1000000 || 0,
        reward: { gems: 50 }, // Add reward
      },
      high_roller: {
        id: "high_roller",
        name: "🎲 นักพนันระดับสูง",
        description: "ชนะพนันในครั้งเดียว 100,000 บาท",
        icon: "🎲",
        condition: (profile) =>
          profile.stats.gamblingStats.biggestWin >= 100000 || 0,
        reward: { gems: 50 }, // Add reward
      },
      // การทำงาน
      workaholic: {
        id: "workaholic",
        name: "👔 คนรักงาน",
        description: "ทำงานครบ 1,000 ครั้ง",
        icon: "👔",
        condition: (profile) => profile.stats.workStats.jobsCompleted >= 1000 || 0,
        reward: { gems: 50 }, // Add reward
      },
      master_worker: {
        id: "master_worker",
        name: "👑 ปรมาจารย์แห่งการทำงาน",
        description: "มีอาชีพที่ถึงเลเวล 50",
        icon: "👑",
        async condition(profile) {
          return Object.values(profile.jobLevels || {}).some(
            (level) => level >= 50
          );
        },
        reward: { gems: 50 }, // Add reward
      },
      // การพนัน
      lucky_streak: {
        id: "lucky_streak",
        name: "🍀 โชคเข้าข้าง",
        description: "ชนะพนันติดต่อกัน 10 ครั้ง",
        icon: "🍀",
        condition: (profile) => profile.stats.gamblingStats.winStreak >= 10 || 0,
        reward: { gems: 50 }, // Add reward
      },
      gambling_master: {
        id: "gambling_master",
        name: "🎰 เซียนพนัน",
        description: "กำไรจากการพนันมากกว่า 1,000,000 บาท !",
        icon: "🎰",
        condition: (profile) => {
          const totalProfit =
            (profile.stats?.gamblingStats?.totalEarned || 0) -
            (profile.stats?.gamblingStats?.totalLost || 0);
          return totalProfit >= 1000000;
        },
        reward: { gems: 50 }, // Add reward
      },
      // การธนาคาร
      savings_master: {
        id: "savings_master",
        name: "🏦 นักออม",
        description: "ได้รับดอกเบี้ยรวมมากกว่า 100,000 บาท",
        icon: "🏦",
        condition: (profile) =>
          profile.stats.bankStats.totalInterestEarned >= 100000 || 0,
        reward: { gems: 50 }, // Add reward
      },
      // // การปล้น - Robber Achievements
      // master_thief: {
      //   id: "master_thief",
      //   name: "🦹‍♂️ จอมโจร",
      //   description: "ปล้นสำเร็จ 100 ครั้ง",
      //   icon: "🦹‍♂️",
      //   condition: (profile) => profile.robStats.asRobber.successful >= 100 || 0,
      //   reward: { gems: 50 }
      // },
      // big_score: {
      //   id: "big_score",
      //   name: "💰 ปล้นครั้งใหญ่",
      //   description: "ปล้นเงินได้มากกว่า 500,000 บาทในครั้งเดียว",
      //   icon: "💰",
      //   condition: (profile) => profile.robStats.asRobber.highestStolen >= 500000 || 0,
      //   reward: { gems: 100 }
      // },

      // // การป้องกัน - Defender Achievements
      // protector: {
      //   id: "protector",
      //   name: "🛡️ ผู้พิทักษ์",
      //   description: "ช่วยขัดขวางการปล้นสำเร็จ 50 ครั้ง",
      //   icon: "🛡️",
      //   condition: (profile) => profile.robStats.asDefender.blocksSuccessful >= 50 || 0,
      //   reward: { gems: 50 }
      // },
      // guardian_angel: {
      //   id: "guardian_angel",
      //   name: "👼 เทพผู้พิทักษ์",
      //   description: "ช่วยปกป้องเงินรวมมากกว่า 1,000,000 บาท",
      //   icon: "👼",
      //   condition: (profile) => profile.robStats.asDefender.moneySaved >= 1000000 || 0,
      //   reward: { gems: 75 }
      // },

      // // การโอนเงิน - Transfer Achievements
      // generous: {
      //   id: "generous",
      //   name: "🤝 ผู้ใจบุญ",
      //   description: "โอนเงินให้ผู้อื่นรวมมากกว่า 1,000,000 บาท",
      //   icon: "🤝",
      //   condition: (profile) => profile.stats.transferStats.sent.total >= 1000000 || 0,
      //   reward: { gems: 50 }
      // },
      // transfer_king: {
      //   id: "transfer_king",
      //   name: "👑 ราชาแห่งการโอน",
      //   description: "โอนเงินมากกว่า 100 ครั้ง",
      //   icon: "👑",
      //   condition: (profile) => profile.stats.transferStats.sent.count >= 100  || 0,
      //   reward: { gems: 50 }
      // },

      // // การพนัน - Gambling Achievements
      // high_stakes: {
      //   id: "high_stakes",
      //   name: "🎰 เดิมพันสูง",
      //   description: "เล่นพนันมากกว่า 1,000 ครั้ง",
      //   icon: "🎰",
      //   condition: (profile) => profile.stats.gamblingStats.gamesPlayed >= 1000 || 0,
      //   reward: { gems: 75 }
      // },
      // // comeback_king: {
      // //   id: "comeback_king",
      // //   name: "💫 ราชาคัมแบ็ค",
      // //   description: "ชนะพนันหลังจากแพ้ติดต่อกัน 5 ครั้ง",
      // //   icon: "💫",
      // //   condition: (profile) => profile.stats.gamblingStats.biggestComeback >= 5 || 0,
      // //   reward: { gems: 50 }
      // // },

      // // การทำงาน - Work Achievements
      // work_dedication: {
      //   id: "work_dedication",
      //   name: "💼 ขยันทำงาน",
      //   description: "ทำงานติดต่อกัน 7 วัน",
      //   icon: "💼",
      //   condition: (profile) => profile.stats.workStats.workStreak >= 7 || 0,
      //   reward: { gems: 50 }
      // },
      // salary_man: {
      //   id: "salary_man",
      //   name: "💵 มนุษย์เงินเดือน",
      //   description: "รายได้จากการทำงานรวมมากกว่า 5,000,000 บาท",
      //   icon: "💵",
      //   condition: (profile) => profile.stats.workStats.totalEarned >= 5000000 || 0,
      //   reward: { gems: 100 }
      // },

      // // การธนาคาร - Bank Achievements
      // bank_lover: {
      //   id: "bank_lover",
      //   name: "🏦 รักการออม",
      //   description: "ฝากเงินมากกว่า 200 ครั้ง",
      //   icon: "🏦",
      //   condition: (profile) => profile.stats.bankStats.deposits >= 200 || 0,
      //   reward: { gems: 50 }
      // },
      // big_spender: {
      //   id: "big_spender",
      //   name: "💸 นักช้อป",
      //   description: "ถอนเงินครั้งเดียวมากกว่า 1,000,000 บาท",
      //   icon: "💸",
      //   condition: (profile) => profile.stats.bankStats.largestWithdraw >= 1000000 || 0,
      //   reward: { gems: 75 }
      // }
    };
  }

  async checkAchievements(userId) {
    const economy = require("./economySystem");
    const profile = await economy.getProfile(userId);
    if (!profile) return [];

    const earnedAchievements = profile.achievements || [];
    const newAchievements = [];
    let totalGems = 0;

    for (const [id, achievement] of Object.entries(this.achievements)) {
      if (!earnedAchievements.includes(id)) {
        const achieved = await achievement.condition(profile);
        if (achieved) {
          newAchievements.push(achievement);
          earnedAchievements.push(id);
          if (achievement.reward?.gems) {
            totalGems += achievement.reward.gems;
          }
        }
      }
    }

    if (newAchievements.length > 0) {
      // Update achievements and add gems
      const currentGems = profile.gems?.common || 0;
      await economy.updateProfile(userId, {
        achievements: earnedAchievements,
        gems: {
          ...profile.gems,
          common: currentGems + totalGems,
        },
      });
    }

    return { achievements: newAchievements, gemsEarned: totalGems };
  }

  // Update getAchievementEmbed to show gem rewards
getAchievementEmbed(userId, result) {
    const embed = new EmbedBuilder()
        .setTitle('🏆 ความสำเร็จใหม่!')
        .setColor('#FFD700')
        .setDescription(
            result.achievements
                .map(a => 
                    `${a.icon} **${a.name}**\n` +
                    `└ ${a.description}\n` +
                    `└ 💎 รางวัล: ${a.reward?.gems || 0} เพชร`
                )
                .join('\n\n')
        );
    
    if (result.gemsEarned > 0) {
        embed.addFields({
            name: '💎 เพชรที่ได้รับทั้งหมด',
            value: `${result.gemsEarned} เพชร`,
            inline: false
        });
    }
    
    return embed;
}

  async getAchievementStats(userId) {
    const economy = require("./economySystem");
    const profile = await economy.getProfile(userId);
    if (!profile || !profile.achievements)
      return { earned: 0, total: Object.keys(this.achievements).length };

    return {
      earned: profile.achievements.length,
      total: Object.keys(this.achievements).length,
    };
  }
}

module.exports = new AchievementSystem();
