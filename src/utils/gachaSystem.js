const { EmbedBuilder } = require("discord.js");
const economy = require("./economySystem");

class GachaSystem {
  constructor() {
    this.pitySystem = {
      SSR: 50, // การันตี SSR ที่ 50 ครั้ง
      SR: 8, // การันตี SR ทุก 8 ครั้ง
    };

    this.gachaRates = {
      SSR: 0.5, // 2%
      SR: 3.5, // 8%
      R: 9, // 20%
      N: 87, // 70%
    };

    this.rewards = {
      SSR: [
        {
          id: "police_role",
          name: "👮ตำรวจ ",
          type: "role",
          roleId: "1348538334603120646",
          description: "ลดโอกาสการถูกปล้น 30% !\n(ถาวร)",
          effects: {
            robbery_rate: -0.3,
          },
        },
        {
          id: "robber",
          name: "🦹‍♂️ โจร",
          type: "role",
          roleId: "1348538334603120645",
          description: "เพิ่มโอกาศการปล้น 15%! \nโอกาสทำเงินตกลดลง 10%\nลดคูลดาวน์ปล้น 20%\n(ถาวร)",
          effects: {
            robbery_rate: 0.15,
            robbery_loss: -0.1,
            robbery_fee_reduction: -0.2,
          },
        },
      ],
      SR: [
        {
          id: "illegal_guns",
          name: "🔫 ปืนเถื่อน",
          description: "เพิ่มเพิ่มโอกาสสำเร็จในการปล้น 10%",
          duration: 3600000, // 1 hour
          type: "temporary",
          effect: { success_rob_rate: 0.1 },
        },
        //บัตรป้องกันการปล้นชั่วคราว
        {
          id: "robbery_card",
          name: "🛡️ บัตรป้องกันการปล้น(ชั่วคราว)",
          description: "ลดโอกาสถูกปล้น 20% (30 นาที)",
          duration: 1800000,
          type: "temporary",
          effects: {
            robbery_rate: -0.2,
          },
        },
      ],
      R: [
        {
          id: "small_boost",
          name: "💫 Small Boost",
          type: "temporary",
          description: "เพิ่มรายได้ 5% (1 ชั่วโมง)",
          duration: 3600000,
          effects: {
            income_boost: 0.05,
          },
        },
      ],
      N: [
        {
          id: "trash",
          name: "🗑️ ขยะ",
          type: "trash",
          value: 100,
          description: "แค่ขยะธรรมดา... (มูลค่า 100 บาท)",
        },
      ],
    };

    this.costPerPull = 80; // ใช้ 80 เพชรต่อการสุ่ม 80 ครั้ง
  }

  async getRarity(userId) {
    const profile = await economy.getProfile(userId);
    const pityCount = profile.gachaStats?.pityCount || { SSR: 0, SR: 0 };

    // ตรวจสอบการการันตี
    if (pityCount.SSR >= this.pitySystem.SSR - 1) {
      return "SSR";
    }
    if (pityCount.SR >= this.pitySystem.SR - 1) {
      return "SR";
    }

    // สุ่มปกติถ้าไม่ถึงการันตี
    const rand = Math.random() * 100;
    let sum = 0;

    for (const [rarity, rate] of Object.entries(this.gachaRates)) {
      sum += rate;
      if (rand < sum) return rarity;
    }
    return "N";
  }

  async updatePityCount(userId, rarity) {
    const profile = await economy.getProfile(userId);
    const gachaStats = profile.gachaStats || {
      totalPulls: 0,
      pityCount: { SSR: 0, SR: 0 },
      obtained: { SSR: 0, SR: 0, R: 0, N: 0 },
    };

    // เพิ่มจำนวนครั้งที่สุ่ม
    gachaStats.totalPulls++;

    // เพิ่มจำนวนที่ได้แต่ละ rarity
    gachaStats.obtained[rarity] = (gachaStats.obtained[rarity] || 0) + 1;

    // อัพเดทค่า pity ตามผลที่ได้
    if (rarity === "SSR") {
      gachaStats.pityCount.SSR = 0;
      gachaStats.pityCount.SR++;
    } else if (rarity === "SR") {
      gachaStats.pityCount.SR = 0;
      gachaStats.pityCount.SSR++;
    } else {
      gachaStats.pityCount.SSR++;
      gachaStats.pityCount.SR++;
    }

    // อัพเดท stats ใน database
    await economy.updateProfile(userId, { gachaStats });

    return gachaStats;
  }

  getRandomReward(rarity) {
    const rewards = this.rewards[rarity];
    return rewards[Math.floor(Math.random() * rewards.length)];
  }

  async pull(userId, client, guildId) {
    try {
      const profile = await economy.getProfile(userId);
      if (!profile?.gems?.common || profile.gems.common < this.costPerPull) {
        return {
          success: false,
          reason: "insufficient_gems",
          required: this.costPerPull,
          current: profile?.gems?.common || 0,
        };
      }

      // หักเพชร
      const currentGems = profile.gems || {};
      currentGems.common = (currentGems.common || 0) - this.costPerPull;

      // สุ่มรางวัลโดยใช้ระบบ pity
      const rarity = await this.getRarity(userId);
      const reward = this.getRandomReward(rarity);

      // อัพเดทค่า pity และ stats
      const gachaStats = await this.updatePityCount(userId, rarity);

      // อัพเดทโปรไฟล์
      const updateData = { gems: currentGems };

      if (reward.type === "role" && client && guildId) {
        try {
          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(userId);
          await member.roles.add(reward.roleId);
        } catch (error) {
          console.error("Error adding role:", error);
          return { success: false, reason: "role_add_failed" };
        }
      } else if (reward.type === "trash") {
        // เพิ่มเงินตามมูลค่าขยะ
        await economy.addMoney(userId, reward.value);
      } else {
        // เพิ่มไอเทมเข้าคลัง
        const inventory = profile.inventory || [];
        const newItem = {
          id: reward.id,
          obtainedAt: Date.now(),
          type: reward.type,
        };

        if (reward.duration) {
          newItem.expiresAt = Date.now() + reward.duration;
        }

        inventory.push(newItem);
        updateData.inventory = inventory;
      }

      await economy.updateProfile(userId, updateData);

      return {
        success: true,
        rarity,
        reward,
        gemsLeft: currentGems.common,
        pityCount: gachaStats.pityCount,
        obtained: gachaStats.obtained,
        totalPulls: gachaStats.totalPulls,
      };
    } catch (error) {
      console.error("Error in gacha pull:", error);
      return { success: false, reason: "system_error" };
    }
  }

  createPullEmbed(result) {
    // Define rarity colors and symbols
    const rarityConfig = {
      SSR: { color: '#FFD700', symbol: '⭐⭐⭐', name: 'LEGENDARY' },
      SR: { color: '#cd60ff', symbol: '⭐⭐', name: 'EPIC' },
      R: { color: '#4169E1', symbol: '⭐', name: 'RARE' },
      N: { color: '#a2e3ff', symbol: '⚪', name: 'COMMON' }
    };

    const rarity = rarityConfig[result.rarity];
    
    const embed = new EmbedBuilder()
      .setTitle(`${rarity.symbol} NEW ${rarity.name}!`)
      .setColor(rarity.color)
      .setDescription(`\`\`\`\n${result.reward.name}\n${result.reward.description || ""}\`\`\``)
      .addFields({
        name: '\u200b',
        value: `┌─────────── Stats ───────────┐
        │ 💎 Gems: ${result.gemsLeft.toLocaleString()}
        │ ⭐ Pity SSR: ${result.pityCount.SSR}/${this.pitySystem.SSR}
        │ ⭐ Pity SR: ${result.pityCount.SR}/${this.pitySystem.SR}
        └───────────────────────────┘`,
        inline: false
      });

    if (result.totalPulls > 0) {
      const stats = [
        `Total Pulls: ${result.totalPulls.toLocaleString()}`,
        `SSR: ${result.obtained.SSR || 0}`,
        `SR: ${result.obtained.SR || 0}`,
        `R: ${result.obtained.R || 0}`,
        `N: ${result.obtained.N || 0}`
      ].join(' • ');

      embed.addFields({
        name: '📊 Pull History',
        value: `\`\`\`\n${stats}\`\`\``,
        inline: false
      });
    }

    // Add footer with rates
    embed.setFooter({ 
      text: `Rates: SSR ${this.gachaRates.SSR}% • SR ${this.gachaRates.SR}% • R ${this.gachaRates.R}% • N ${this.gachaRates.N}%` 
    });

    // Add timestamp
    embed.setTimestamp();

    return embed;
}
}

module.exports = new GachaSystem();
