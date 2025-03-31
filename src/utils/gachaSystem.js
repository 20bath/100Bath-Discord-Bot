const { EmbedBuilder } = require("discord.js");
const economy = require("./economySystem");

class GachaSystem {
  constructor() {
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
          description: "ลดโอกาสการถูกปล้น 30% ! (ถาวร)",
          effects: {
            robbery_rate: -0.3,
          },
        },
      ],
      SR: [
        {
          id: "illegal_guns",
          name: "🔫 ปืนเถื่อน",
          description: "เพิ่มเพิ่มโอกาสสำเร็จในการปล้น 10%",
          duration: 3600000, // 1 hour
          type: "permanent",
          effect: { success_rob_rate: 0.1 },
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
          description: "แค่ขยะธรรมดา...",
        },
      ],
    };

    this.costPerPull = 80; // ใช้ 80 เพชรต่อการสุ่ม 80 ครั้ง
  }

  getRarity() {
    const rand = Math.random() * 100;
    let sum = 0;

    for (const [rarity, rate] of Object.entries(this.gachaRates)) {
      sum += rate;
      if (rand < sum) return rarity;
    }
    return "N";
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

      // สุ่มรางวัล
      const rarity = this.getRarity();
      const reward = this.getRandomReward(rarity);

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
      };
    } catch (error) {
      console.error("Error in gacha pull:", error);
      return { success: false, reason: "system_error" };
    }
  }

  createPullEmbed(result) {
    const embed = new EmbedBuilder()
      .setTitle("🎲 ผลการสุ่มกาชา")
      .setColor(
        result.rarity === "SSR"
          ? "#fff460"
          : result.rarity === "SR"
          ? "#c966fd"
          : result.rarity === "R"
          ? "#60d0ff"
          : "#bbeafe"
      )
      .addFields(
        {
          name: "🎁 รางวัลที่ได้",
          value: `${result.reward.name}\n${result.reward.description || ""}`,
          inline: true,
        },
        {
          name: "⭐ ระดับความหายาก",
          value: result.rarity,
          inline: true,
        },
        {
          name: "💎 เพชรคงเหลือ",
          value: `${result.gemsLeft} เม็ด`,
          inline: true,
        }
      );

    return embed;
  }
}

module.exports = new GachaSystem();
