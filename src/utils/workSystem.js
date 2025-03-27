const { Collection } = require("discord.js");
const economy = require("./economySystem");
const levelSystem = require("./levelSystem");

class WorkSystem {
  constructor() {
    this.jobs = [
      {
        id: "junk",
        name: "🗑️ เก็บขยะขาย", 
        requiredLevel: 0,
        cooldown: 5000, // 5 seconds
        pay: { base: 10, multiplier: 1.1 },
        exp: { base: 3, multiplier: 1.05 },
        items: [
          { id: "trash", name: "🚮 ขยะ", chance: 0.2, value: 50 },
          { id: "recyclable", name: "♻️ ขยะรีไซเคิล", chance: 0.1, value: 100 },
        ],
      },
      {
        id: "office",
        name: "🏢 พนักงานออฟฟิศ",
        requiredLevel: 1,
        cooldown: 3 * 60 * 1000, // 3 minutes
        pay: { base: 100, multiplier: 1.2 },
        exp: { base: 5, multiplier: 1.1 },
        items: [
          { id: "document", name: "📄 เอกสารสำคัญ", chance: 0.1, value: 300 },
          { id: "coffee", name: "☕ กาแฟพรีเมียม", chance: 0.3, value: 100 },
        ],
      },
      {
        id: "taxi",
        name: "🚗 คนขับแท็กซี่",
        requiredLevel: 5,
        cooldown: 3 * 60 * 1000, // 3 minutes
        pay: { base: 150, multiplier: 1.3 },
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
      },
      {
        id: "chef",
        name: "👨‍🍳 เชฟ",
        requiredLevel: 10,
        cooldown: 3 * 60 * 1000, // 3 minutes
        pay: { base: 200, multiplier: 1.4 },
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
      },
      {
        id: "programmer",
        name: "💻 โปรแกรมเมอร์",
        requiredLevel: 20,
        cooldown: 3 * 60 * 1000, // 3 minutes
        pay: { base: 300, multiplier: 1.5 },
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
      },
      {
        id: "doctor",
        name: "👨‍⚕️ หมอ",
        requiredLevel: 30,
        cooldown: 3 * 60 * 1000, // 3 minutes
        pay: { base: 500, multiplier: 1.6 },
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
      },
    ];
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

  async checkJobCooldown(userId, jobId) {
    try {
    const cooldownKey = `work_${jobId}`;
    return await economy.checkCooldown(userId, cooldownKey);
    } catch (error) {
      console.error(error);
    }
  }

  // Add new method to set job-specific cooldown
  async setJobCooldown(userId, jobId, duration) {
    try {
    const cooldownKey = `work_${jobId}`;
    await economy.setCooldown(userId, cooldownKey, duration);
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

      // คำนวณรายได้และ exp
      const basePay = this.calculatePay(job.pay.base, jobLevel);
      const amount = Math.floor(basePay * (0.8 + Math.random() * 0.4));
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

      // Update profile
      await economy.updateProfile(user.id, {
        [`jobLevels.${job.id}`]: newJobLevel,
        [`jobExp.${job.id}`]: currentJobExp % jobExpNeeded,
        "stats.workStats.totalWorked":
          profile.stats.workStats.totalWorked + amount,
        "stats.workStats.jobsCompleted":
          profile.stats.workStats.jobsCompleted + 1,
        "stats.workStats.lastPaycheck": amount,
      });

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
        await economy.updateProfile(user.id, { inventory });
      }

      // Add money and exp
      const newBalance = await economy.addMoney(user.id, amount);
      await levelSystem.addXP(user, expGain);

      return {
        success: true,
        job: job.name,
        jobLevel,
        amount,
        newBalance,
        exp: expGain,
        items: items.length > 0 ? items : null,
        levelUp: newJobLevel > jobLevel,
      };
    } catch (error) {
      console.error("Error in work system:", error);
      return { success: false, reason: "system_error" };
    }
  }
}

module.exports = new WorkSystem();
