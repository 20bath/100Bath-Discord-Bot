const { Collection } = require("discord.js");
const economy = require("./economySystem");
const levelSystem = require("./levelSystem");
const achievement = require("./achievementSystem");
const shop = require("./shopSystem");
const QuestSystem = require("./questDailySystem");

class WorkSystem {
  constructor() {
    (this.gems = {
      common: { name: "💎 100BathGems ", chance: 0.7, value: 10 },
      // uncommon: { name: "🔮 เพชรแห่งการทำนาย", chance: 0.05, value: 800 },
      // rare: { name: "🪐 เพชรแห่งโชค", chance: 0.01, value: 1000 },
      // epic: { name: "💎 เพชรแท้", chance: 0.005, value: 10000 }
    }),
      (this.GEM_CONFIG = {
        DAILY_LIMIT: 500,
        RESET_HOUR: 0, // Reset at midnight
      }),
      (this.jobs = [
        {
          id: "junk",
          name: "🗑️ เก็บขยะขาย",
          requiredLevel: 0,
          cooldown: 5000, // 10 seconds
          pay: { base: 20, multiplier: 1.1 },
          exp: { base: 3, multiplier: 1.05 },
          items: [
            { id: "trash", name: "🚮 ขยะ", chance: 0.2, value: 50 },
            {
              id: "recyclable",
              name: "♻️ ขยะรีไซเคิล",
              chance: 0.1,
              value: 100,
            },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          //เก็บผลไม้ขาย
          id: "fruit",
          name: "🍏 เก็บผลไม้",
          requiredLevel: 0,
          cooldown: 5000, // 5 seconds
          pay: { base: 25, multiplier: 1.1 },
          exp: { base: 3, multiplier: 1.05 },
          items: [
            {
              id: "trash",
              name: "🍎 ผลไม้คุณภาพค่อนข้างดี",
              chance: 0.25,
              value: 40,
            },
            {
              id: "recyclable",
              name: "🍎 ผลไม้คุณภาพดี",
              chance: 0.2,
              value: 50,
            },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          id: "office",
          name: "🏢 พนักงานออฟฟิศ",
          requiredLevel: 1,
          cooldown: 1 * 60 * 1000, // 3 minutes
          pay: { base: 300, multiplier: 1.2 },
          exp: { base: 5, multiplier: 1.1 },
          items: [
            { id: "document", name: "📄 เอกสารสำคัญ", chance: 0.1, value: 300 },
            { id: "coffee", name: "☕ กาแฟพรีเมียม", chance: 0.3, value: 100 },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          id: "taxi",
          name: "🚗 คนขับแท็กซี่",
          requiredLevel: 5,
          cooldown: 2 * 60 * 1000, // 3 minutes
          pay: { base: 250, multiplier: 1.3 },
          exp: { base: 8, multiplier: 1.15 },
          items: [
            {
              id: "lost_wallet",
              name: "👛 กระเป๋าเงินที่ลูกค้าลืม",
              chance: 0.05,
              value: 500,
            },
            { id: "tip", name: "💵 ทิปพิเศษ", chance: 0.1, value: 200 },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          id: "chef",
          name: "👨‍🍳 เชฟ",
          requiredLevel: 10,
          cooldown: 2 * 60 * 1000, // 3 minutes
          pay: { base: 500, multiplier: 1.4 },
          exp: { base: 12, multiplier: 1.2 },
          items: [
            {
              id: "rare_recipe",
              name: "📒 สูตรอาหารลับ",
              chance: 0.03,
              value: 1000,
            },
            {
              id: "gourmet_dish",
              name: "🍽️ อาหารระดับพรีเมียม",
              chance: 0.15,
              value: 400,
            },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          id: "programmer",
          name: "💻 โปรแกรมเมอร์",
          requiredLevel: 20,
          cooldown: 3 * 60 * 1000, // 3 minutes
          pay: { base: 800, multiplier: 1.5 },
          exp: { base: 15, multiplier: 1.25 },
          items: [
            {
              id: "software_license",
              name: "🔑 License ซอฟต์แวร์",
              chance: 0.02,
              value: 2000,
            },
            { id: "crypto", name: "🪙 เหรียญ Crypto", chance: 0.1, value: 800 },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
        {
          id: "doctor",
          name: "👨‍⚕️ หมอ",
          requiredLevel: 30,
          cooldown: 3 * 60 * 1000, // 3 minutes
          pay: { base: 1000, multiplier: 1.6 },
          exp: { base: 20, multiplier: 1.3 },
          items: [
            {
              id: "medical_research",
              name: "🔬 ผลวิจัยทางการแพทย์",
              chance: 0.01,
              value: 5000,
            },
            { id: "medicine", name: "💊 ยาหายาก", chance: 0.08, value: 1200 },
          ],
          gems: ["common"], // เพิ่มโอกาสดรอปเพชรธรรมดา
        },
      ]);
  }

  getJobs() {
    return this.jobs;
  }

  getJobChoices() {
    try {
      return this.jobs.map((job) => ({
        name: job.name,
        value: job.id,
      }));
    } catch (error) {
      console.error(error);
    }
  }
  async getJobLevel(userId, jobId) {
    try {
      const profile = await economy.getProfile(userId);
      return profile.jobLevels?.[jobId] || 0;
    } catch (error) {
      console.error(error);
    }
  }

  calculatePay(baseAmount, jobLevel) {
    const growthPercent = 0.05; // เพิ่ม 5% ต่อเลเวล
    return Math.floor(baseAmount * (1 + growthPercent * jobLevel));
  }

  calculateExp(baseExp, jobLevel) {
    const growthPercent = 0.05; // เพิ่ม 5% ต่อเลเวล
    return Math.floor(baseExp * (1 + growthPercent * jobLevel));
  }

  // Add new method to check daily gems
  async getDailyGemsEarned(userId) {
    const profile = await economy.getProfile(userId);
    const now = new Date();
    const lastGemReset = profile.lastGemReset ? new Date(profile.lastGemReset) : null;

    // Reset if it's a new day
    if (!lastGemReset || 
        lastGemReset.getDate() !== now.getDate() || 
        lastGemReset.getMonth() !== now.getMonth() || 
        lastGemReset.getFullYear() !== now.getFullYear()) {
      await economy.updateProfile(userId, {
        dailyGemsEarned: 0,
        lastGemReset: now.getTime()
      });
      return 0;
    }

    return profile.dailyGemsEarned || 0;
  }

  // Modify rollForGems method
  async rollForGems(job, jobLevel, userId) {
    const gems = [];
    if (!job.gems) return gems;

    // Check daily limit
    const dailyGemsEarned = await this.getDailyGemsEarned(userId);
    if (dailyGemsEarned >= this.GEM_CONFIG.DAILY_LIMIT) {
      return gems;
    }

    const gemsRemaining = this.GEM_CONFIG.DAILY_LIMIT - dailyGemsEarned;

    for (const gemType of job.gems) {
      const gem = this.gems[gemType];
      if (!gem) continue;

      const levelBonus = Math.min(jobLevel * 0.02, 1);
      const dropChance = gem.chance * (1 + levelBonus);

      if (Math.random() < dropChance && gems.length < gemsRemaining) {
        gems.push({
          type: gemType,
          ...gem
        });
      }
    }
    return gems;
  }

  async checkJobCooldown(userId, jobId) {
    try {
      const cooldownKey = `work_${jobId}`;
      return await economy.checkCooldownCache(userId, cooldownKey);
    } catch (error) {
      console.error(error);
    }
  }

  // Add new method to set job-specific cooldown
  async setJobCooldown(userId, jobId, duration) {
    try {
      const cooldownKey = `work_${jobId}`;
      await economy.setCooldownCache(userId, cooldownKey, duration);
    } catch (error) {
      console.error(error);
    }
  }

  async work(user, jobId) {
    try {
      const profile = await economy.getProfile(user.id);
      const userLevel = await levelSystem.getLevel(user.id);

      // หาอาชีพที่เลือก
      const job = this.jobs.find((j) => j.id === jobId);
      if (!job) {
        return { success: false, reason: "invalid_job" };
      }

      // ตรวจสอบเลเวล
      if (job.requiredLevel > userLevel) {
        return { success: false, reason: "level_too_low" };
      }

      const jobLevel = await this.getJobLevel(user.id, job.id);

      // Get active effects
      const effects = await shop.checkEffects(user.id);
      const workBonus = effects.work_bonus || 0;
      const moneyBoost = effects.money_boost || 0;
      const incomeBoost = effects.income_boost || 0;

      // Calculate total bonus
      const totalBonus = 1 + workBonus + moneyBoost + incomeBoost;

      // Apply bonus to earnings
      const basePay = this.calculatePay(job.pay.base, jobLevel);
      const amount = Math.floor(
        basePay * (0.8 + Math.random() * 0.4) * totalBonus
      );

      const expGain = this.calculateExp(job.exp.base, jobLevel);

      // Try to get items
      const items = [];
      for (const item of job.items) {
        const dropChance = item.chance * (1 + jobLevel * 0.1); // Increase chance with job level
        if (Math.random() < dropChance) {
          items.push(item);
        }
      }

      // Update job level
      const jobExpNeeded = 100 * Math.pow(1.5, jobLevel);
      const currentJobExp = (profile.jobExp?.[job.id] || 0) + expGain;
      let newJobLevel = jobLevel;

      if (currentJobExp >= jobExpNeeded) {
        newJobLevel++;
      }

      // Roll for gems with userId parameter
      const droppedGems = await this.rollForGems(job, jobLevel, user.id);

      await QuestSystem.updateQuestProgress(user.id, "work_earnings", amount);

      // Update profile
      const updateData = {
        [`jobLevels.${job.id}`]: newJobLevel,
        [`jobExp.${job.id}`]: currentJobExp % jobExpNeeded,
        "stats.workStats.totalWorked":
          profile.stats.workStats.totalWorked + amount,
        "stats.workStats.jobsCompleted":
          profile.stats.workStats.jobsCompleted + 1,
        "stats.workStats.lastPaycheck": amount,
      };

      // Update daily gems count if gems dropped
      if (droppedGems.length > 0) {
        const currentGems = profile.gems || {};
        const dailyGemsEarned = (profile.dailyGemsEarned || 0) + droppedGems.length;

        droppedGems.forEach((gem) => {
          currentGems[gem.type] = (currentGems[gem.type] || 0) + 1;
        });

        updateData.gems = currentGems;
        updateData.dailyGemsEarned = dailyGemsEarned;
        updateData.lastGemReset = updateData.lastGemReset || Date.now();
      }

      // Add items to inventory if any
      if (items.length > 0) {
        const inventory = profile.inventory || [];
        items.forEach((item) => {
          inventory.push({
            id: item.id,
            name: item.name,
            type: "work_item",
            value: item.value,
            obtainedAt: Date.now(),
          });
        });
        updateData.inventory = inventory;
      }

      // Update profile with all changes at once
      await economy.updateProfile(user.id, updateData);

      // Add money and exp
      const newBalance = await economy.addMoney(user.id, amount);
      await levelSystem.addXP(user, expGain);

      const newAchievements = await achievement.checkAchievements(user.id);
      if (newAchievements.length > 0) {
        const achievementEmbed = achievement.getAchievementEmbed(
          user.id,
          newAchievements
        );
        await interaction.channel.send({ embeds: [achievementEmbed] });
      }

      return {
        success: true,
        job: job.name,
        jobLevel,
        amount,
        newBalance,
        exp: expGain,
        items: items.length > 0 ? items : null,
        gems: droppedGems.length > 0 ? droppedGems : null,
        levelUp: newJobLevel > jobLevel,
        dailyGemsEarned: updateData.dailyGemsEarned || 0,
        gemLimitReached: (updateData.dailyGemsEarned || 0) >= this.GEM_CONFIG.DAILY_LIMIT
      };
    } catch (error) {
      console.error("Error in work system:", error);
      return { success: false, reason: "system_error" };
    }
  }
}

module.exports = new WorkSystem();
