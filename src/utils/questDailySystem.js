const { EmbedBuilder } = require("discord.js");
const economy = require("./economySystem");

class QuestDailySystem {
  constructor() {
    this.STREAK_REWARDS = {
        3: { gems: 30 },    // 3 วันติดต่อกัน
        7: { gems: 100 },   // 7 วันติดต่อกัน
        14: { gems: 250 },  // 14 วันติดต่อกัน
        30: { gems: 1000 }, // 30 วันติดต่อกัน
        100: { gems: 5000 }, // 100 วันติดต่อกัน
        365: { gems: 10000 }, // 365 วันติดต่อกัน
    };
    this.quests = {
      gambling: [
        {
          id: "win_blackjack",
          name: "🎰 นักพนันผู้โชคดี",
          description: "ชนะเกม Blackjack 3 ครั้ง",
          type: "blackjack_wins",
          target: 3,
          reward: { money: 3000 },
        },
        {
          id: "survive_crash",
          name: "💥 ผู้รอดชีวิต",
          description: "ถอนเงินในเกม Crash ที่ตัวคูณ 3.0x หรือมากกว่า",
          type: "crash_cashout",
          target: 1,
          condition: { multiplier: 3.0 },
          reward: { money: 3000 },
        },
      ],
      economy: [
        {
          id: "work_master",
          name: "👷 คนขยัน",
          description: "ทำงานให้ได้ 5,000 บาท",
          type: "work_earnings",
          target: 5000,
          reward: { money: 3000 },
        },
        //     {
        //         id: 'bank_saver',
        //         name: '🏦 นักออม',
        //         description: 'ฝากเงินในธนาคาร 20,000 บาท',
        //         type: 'bank_deposit',
        //         target: 20000,
        //         reward: { money: 4000 }
        //     }
      ],
      social: [
        {
          id: "generous_gifter",
          name: "🎁 ผู้ใจบุญ",
          description: "โอนเงินให้ผู้เล่นอื่น 3,000 บาท",
          type: "transfer_amount",
          target: 3000,
          reward: { money: 3000 },
        },
        {
          id: "rob_master",
          name: "🦹 โจรสลัด",
          description: "ปล้นสำเร็จ 2 ครั้ง",
          type: "successful_robs",
          target: 2,
          reward: { money: 4000 },
        },
      ],
    };

    this.QUEST_CONFIG = {
      DAILY_QUESTS: 3, // จำนวนเควสต่อวัน
      RESET_HOUR: 0, // รีเซ็ตเวลา 00:00
      RESET_MINUTE: 0,
    };
  }

  async updateStreak(userId) {
    const profile = await economy.getProfile(userId);
    const now = new Date();
    const lastUpdate = profile.lastQuestReset ? new Date(profile.lastQuestReset) : null;
    let currentStreak = profile.questStreak || 0;
    
    // Check if the user completed quests yesterday
    if (lastUpdate) {
        const dayDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
        if (dayDiff > 1) {
            // Reset streak if missed a day
            currentStreak = 0;
        }
    }
    
    // Increment streak
    currentStreak++;
    
    // Check for streak rewards
    let streakReward = null;
    if (this.STREAK_REWARDS[currentStreak]) {
        streakReward = this.STREAK_REWARDS[currentStreak];
        // Give streak reward
        const currentGems = profile.gems || {};
        await economy.updateProfile(userId, {
            gems: {
                ...currentGems,
                common: (currentGems.common || 0) + streakReward.gems
            }
        });
    }
    
    // Update streak in profile
    await economy.updateProfile(userId, {
        questStreak: currentStreak
    });
    
    return { currentStreak, streakReward };
}

  async getDailyQuests(userId) {
    const profile = await economy.getProfile(userId);
    if (!profile) return null;

    // ตรวจสอบว่าควรรีเซ็ตเควสหรือไม่
    if (this.shouldResetQuests(profile.lastQuestReset)) {
      return this.generateNewQuests(userId);
    }

    return profile.dailyQuests || [];
  }

  async generateNewQuests(userId) {
    const allQuests = [
      ...this.quests.gambling,
      ...this.quests.economy,
      ...this.quests.social,
    ];

    // สุ่มเควส
    const selectedQuests = [];
    const questPool = [...allQuests];

    for (let i = 0; i < this.QUEST_CONFIG.DAILY_QUESTS; i++) {
      if (questPool.length === 0) break;

      const randomIndex = Math.floor(Math.random() * questPool.length);
      const quest = questPool.splice(randomIndex, 1)[0];

      selectedQuests.push({
        ...quest,
        progress: 0,
        completed: false,
      });
    }

    // อัพเดทในฐานข้อมูล
    await economy.updateProfile(userId, {
      dailyQuests: selectedQuests,
      lastQuestReset: Date.now(),
    });

    return selectedQuests;
  }

  shouldResetQuests(lastReset) {
    if (!lastReset) return true;

    const now = new Date();
    const lastResetDate = new Date(lastReset);

    // ตรวจสอบว่าผ่านเที่ยงคืนหรือยัง
    return (
      now.getDate() !== lastResetDate.getDate() ||
      now.getMonth() !== lastResetDate.getMonth() ||
      now.getFullYear() !== lastResetDate.getFullYear()
    );
  }

  async updateQuestProgress(userId, questType, amount, conditions = {}, channel = null) {
    const quests = await this.getDailyQuests(userId);
    if (!quests) return false;

    let updated = false;
    let completedQuests = [];
    const updatedQuests = quests.map((quest) => {
        if (quest.type === questType && !quest.completed) {
            // ตรวจสอบเงื่อนไขพิเศษ (ถ้ามี)
            if (quest.condition) {
                for (const [key, value] of Object.entries(quest.condition)) {
                    if (!conditions[key] || conditions[key] < value) {
                        return quest;
                    }
                }
            }

            quest.progress += amount;
            if (quest.progress >= quest.target && !quest.completed) {
                quest.completed = true;
                completedQuests.push(quest);
            }
            updated = true;
        }
        return quest;
    });

    if (updated) {
        // อัพเดทเควสในโปรไฟล์
        await economy.updateProfile(userId, { dailyQuests: updatedQuests });

        // ถ้ามีเควสที่เพิ่งทำเสร็จ
        if (completedQuests.length > 0) {
            const profile = await economy.getProfile(userId);
            const allCompleted = updatedQuests.every(quest => quest.completed);
            
            // ให้รางวัลสำหรับแต่ละเควสที่ทำเสร็จ
            for (const quest of completedQuests) {
                // ให้เงินรางวัล
                if (quest.reward.money) {
                    await economy.addMoney(userId, quest.reward.money);
                }

                // ให้เพชรรางวัล (10 เพชรต่อเควส)
                const currentGems = profile.gems || {};
                await economy.updateProfile(userId, {
                    gems: {
                        ...currentGems,
                        common: (currentGems.common || 0) + 10
                    }
                });
            }

            // ถ้าทำครบทุกเควส ให้โบนัสพิเศษ
            if (allCompleted) {
                const currentGems = profile.gems || {};
                await economy.updateProfile(userId, {
                    gems: {
                        ...currentGems,
                        common: (currentGems.common || 0) + 20
                    }
                });
            }

            // สร้าง embed แจ้งเตือนรางวัล
            const rewardEmbeds = completedQuests.map(quest => {
                return new EmbedBuilder()
                    .setTitle("✨ เควสสำเร็จ!")
                    .setColor("#00ff00")
                    .setDescription(`คุณทำเควส "${quest.name}" สำเร็จ!`)
                    .addFields([
                        {
                            name: "💰 เงินรางวัล",
                            value: `${quest.reward.money.toLocaleString()} บาท`,
                            inline: true
                        },
                        {
                            name: "💎 เพชรรางวัล",
                            value: "10 เม็ด",
                            inline: true
                        }
                    ])
                    .setTimestamp();
            });

            if (allCompleted) {
                rewardEmbeds.push(
                    new EmbedBuilder()
                        .setTitle("🎉 โบนัสพิเศษ!")
                        .setColor("#ffd700")
                        .setDescription("```\nยินดีด้วย! คุณทำเควสประจำวันครบทุกอัน\n```")
                        .addFields({
                            name: "🎁 รางวัลโบนัส",
                            value: "💎 20 เม็ด",
                            inline: false
                        })
                        .setTimestamp()
                );
            }

            if (updated && channel) {
                if (completedQuests.length > 0) {
                    // Check if all quests are completed
                    if (allCompleted) {
                        // Update streak
                        const { currentStreak, streakReward } = await this.updateStreak(userId);
                        
                        // Create streak embed
                        const streakEmbed = new EmbedBuilder()
                            .setTitle("🔥 เควสประจำวัน Streak!")
                            .setColor("#ff9900")
                            .setDescription(`<@${userId}> ทำเควสติดต่อกันเป็นวันที่ ${currentStreak}!`);
        
                        if (streakReward) {
                            streakEmbed.addFields({
                                name: "🎁 รางวัล Streak พิเศษ!",
                                value: `💎 ${streakReward.gems} เม็ด`,
                                inline: false
                            });
                        }
        
                        streakEmbed.addFields({
                            name: "📊 Streak ถัดไป",
                            value: this.getNextStreakInfo(currentStreak),
                            inline: false
                        });
        
                        rewardEmbeds.push(streakEmbed);
                    }
        
                    // Send notifications to channel
                    await channel.send({ 
                        content: `<@${userId}> ได้รับรางวัลจากการทำเควส!`,
                        embeds: rewardEmbeds 
                    });
                }
            }

            return {
                updated: true,
                completedQuests,
                rewardEmbeds,
                allCompleted
            };
        }
    }

    return { updated: false };
}

getNextStreakInfo(currentStreak) {
    const streakDays = Object.keys(this.STREAK_REWARDS).map(Number).sort((a, b) => a - b);
    const nextStreak = streakDays.find(days => days > currentStreak);
    
    if (nextStreak) {
        const daysUntilNext = nextStreak - currentStreak;
        return `อีก ${daysUntilNext} วัน จะได้รับรางวัลพิเศษ 💎 ${this.STREAK_REWARDS[nextStreak].gems} เม็ด!`;
    }
    return "คุณได้รับรางวัล Streak สูงสุดแล้ว!";
}

  async giveQuestReward(userId, reward) {
    const profile = await economy.getProfile(userId);
    
    // Get current quests to check completion status
    const quests = await this.getDailyQuests(userId);
    const allCompleted = quests.every(quest => quest.completed);
    
    // Give money reward
    if (reward.money) {
        await economy.addMoney(userId, reward.money);
    }

    // Add gems reward
    const currentGems = profile.gems || {};
    const updates = {
        gems: {
            ...currentGems,
            common: (currentGems.common || 0) + 10 // Add 10 gems per quest
        }
    };

    // Add bonus 20 gems if all quests completed
    if (allCompleted) {
        updates.gems.common += 20;
    }

    // Update profile with new gems
    await economy.updateProfile(userId, updates);

    // Create reward notification embed
    const embed = new EmbedBuilder()
        .setTitle("✨ เควสสำเร็จ!")
        .setColor("#00ff00")
        .addFields([
            {
                name: "💰 เงินรางวัล",
                value: `${reward.money.toLocaleString()} บาท`,
                inline: true
            },
            {
                name: "💎 เพชรรางวัล",
                value: "10 เม็ด",
                inline: true
            }
        ]);

    if (allCompleted) {
        embed.addFields({
            name: "🎁 โบนัสทำเควสครบ",
            value: "💎 20 เม็ด",
            inline: false
        })
        .setDescription("```\nยินดีด้วย! คุณทำเควสประจำวันครบทุกอัน\n```");
    }

    embed.setTimestamp();
    return embed;
}

  // Update createQuestEmbed to show gem rewards
createQuestEmbed(quests) {
    const allCompleted = quests.every(quest => quest.completed);

    return new EmbedBuilder()
        .setTitle("📋 เควสประจำวัน")
        .setColor("#00ff00")
        .setDescription("```\nทำเควสเพื่อรับรางวัล! รีเซ็ตทุกเที่ยงคืน\n```")
        .addFields(
            quests.map(quest => ({
                name: `${quest.completed ? "✅" : "⭐"} ${quest.name}`,
                value: 
                    `${quest.description}\n` +
                    `ความคืบหน้า: ${quest.progress}/${quest.target}\n` +
                    `รางวัล: 💰 ${quest.reward.money.toLocaleString()} บาท + 💎 10 เม็ด`,
                inline: false
            }))
        )
        .addFields({
            name: "🎁 รางวัลพิเศษเมื่อทำครบทุกเควส",
            value: `💎 20 เม็ด ${allCompleted ? "(รับแล้ว ✅)" : ""}`,
            inline: false
        })
        .setTimestamp();
}
}

module.exports = new QuestDailySystem();
