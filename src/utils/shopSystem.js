const { Collection } = require("discord.js");
const economy = require("./economySystem");

class ShopSystem {
  constructor() {
    this.items = {
      // อุปกรณ์ถาวร
      permanent: {
        work_badge: {
          id: "work_badge",
          name: "💼 เน็กไทเมืองทอง",
          description: "เพิ่มรายได้จากการทำงาน 5%",
          price: 150000,
          type: "permanent",
          effect: { work_bonus: 0.05 },
        },
        illegal_guns: {
          id: "illegal_guns",
          name: "🔫 ปืนเถื่อน",
          description: "เพิ่มเพิ่มโอกาสสำเร็จในการปล้น 10%",
          price: 250000,
          type: "permanent",
          effect: { success_rob_rate: 0.1 },
        },
        pig_bank: {
          id: "pig_bank",
          name: "🐷 กระปุกหมูเด้ง",
          description: "เพิ่มวงเงินในธนาคาร 50000 บาท",
          price: 300000,
          type: "permanent",
          effect: { bank_balance: 50000 },
        },
      },
      // ไอเทมชั่วคราว
      temporary: {
        xp_boost: {
          id: "xp_boost",
          name: "📚 อ่าน TCAS ",
          description: "เพิ่ม EXP 10% (2 ชั่วโมง)",
          price: 5000,
          duration: 7200000, // 24 hours
          type: "temporary",
          effect: { xp_boost: 0.1 },
        },
        money_boost: {
          id: "money_boost",
          name: "💰 ไลฟ์สด Tiktok",
          description: "เพิ่มรายได้ทั้งหมด 10% (2 ชั่วโมง)",
          price: 7500,
          duration: 7200000, // 12 hours
          type: "temporary",
          effect: { money_boost: 0.1 },
        },
        makeshift_gun: {
          id: "makeshift_gun",
          name: "🔫 ปืนกระดาษ",
          description: "เพิ่มเพิ่มโอกาสสำเร็จในการปล้น 3% (2 ชั่วโมง)",
          price: 12000,
          duration: 7200000, // 2 hours
          type: "temporary",
          effect: { success_rob_rate: 0.03 },
        },
        //บัตรป้องกันการปล้น
        robbery_card: {
          id: "robbery_card",
          name: "🛡️ บัตรป้องกันการปล้น",
          description: "ป้องกันการถูกปล้น (1 ชั่วโมง)",
          price: 15000,
          duration: 3600000, // 1 hours
          type: "temporary",
          effect: { robbery_card: true },
        },
      },
      // ยศพิเศษ
      roles: {
        vip: {
          id: "vip",
          name: "👑 มหาเศรษฐีพันล้าน(VIP)",
          description: "เพิ่มรายได้ 15%, ลดค่าธรรมเนียม 20%",
          price: 10000000,
          type: "role",
          roleId: "1348538334603120644",
          effect: {
            income_boost: 0.15,
            fee_reduction: 0.2,
          },
        },
      },
    };
  }

  getShopItems() {
    return this.items;
  }

  // Add description for each category
  getCategoryInfo() {
    return {
      permanent: {
        name: "🛡️ อุปกรณ์ถาวร",
        description: "ไอเทมที่ให้ผลถาวร ไม่มีวันหมดอายุ",
      },
      temporary: {
        name: "⏳ ไอเทมชั่วคราว",
        description: "ไอเทมที่มีระยะเวลาจำกัด ให้ผลเพิ่มขึ้นชั่วคราว",
      },
      roles: {
        name: "👑 ยศพิเศษ",
        description: "ยศที่มอบสิทธิพิเศษและโบนัสพิเศษต่างๆ",
      },
      gems: {
        name: "💎 เพชรกาชา",
        description: `**💎 ร้านค้าเพชรกาชา**
        
        📱 **วิธีการซื้อ**
        1. สแกน QR Code ด้านล่าง
        2. โอนเงินตามจำนวนที่ต้องการ
        3. ส่งสลิปที่ <@1348499224656089100>
        4. หากไม่ได้รับการตอบกลับ ส่งที่ <@343340587396628480>
        
        💰 **อัตราแลกเปลี่ยน**
        • 1 บาท = 1 เพชร
        • 50 บาท = 50+5 เพชร
        • 100 บาท = 100+15 เพชร
        • 500 บาท = 500+100 เพชร
        
        ⚠️ **หมายเหตุ**
        • เพชรจะถูกเพิ่มเข้าบัญชีภายใน 24 ชั่วโมง
        • ขั้นต่ำในการเติม 50 บาท
        • เก็บสลิปไว้เป็นหลักฐาน`,
    },
    };
  }

  // Add method to get item details for display
  getItemDetails(item) {
    let details = `💰 ราคา: ${item.price} บาท\n`;

    if (item.duration) {
      const hours = item.duration / 3600000;
      details += `⏳ ระยะเวลา: ${hours} ชั่วโมง\n`;
    }

    if (item.effect && typeof item.effect === "object") {
      details += "✨ ผลของไอเทม:\n";
      for (const [effect, value] of Object.entries(item.effect)) {
        const effectName = this.getEffectName(effect);
        details += `📝${item.description}\n`;
      }
    }

    return details;
  }

  // Helper method to get effect names in Thai
  getEffectName(effect) {
    const effectNames = {
      gambling_luck: "โอกาสชนะการพนัน",
      work_bonus: "รายได้จากการทำงาน",
      xp_boost: "EXP ที่ได้รับ",
      money_boost: "รายได้ทั้งหมด",
      income_boost: "รายได้โดยรวม",
      fee_reduction: "ลดค่าธรรมเนียม",
      success_rob_rate: "โอกาสสำเร็จในการปล้น",
      bank_balance: "วงเงินในธนาคาร",
      robbery_card: "บัตรป้องกันการปล้น",
    };
    return effectNames[effect] || effect;
  }

  findItem(itemId) {
    try {
      for (const category of Object.values(this.items)) {
        if (itemId in category) {
          return category[itemId];
        }
      }
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async cleanupExpiredItems(userId) {
    const profile = await economy.getProfile(userId);
    if (!profile?.inventory) return;

    const now = Date.now();
    const validItems = profile.inventory.filter((item) => {
      return !item.expiresAt || item.expiresAt > now;
    });

    if (validItems.length !== profile.inventory.length) {
      await economy.updateProfile(userId, { inventory: validItems });
      return true; // มีการลบไอเทม
    }
    return false;
  }

  async buyItem(userId, itemId, guildId = null, client = null) {
    try {
      const item = this.findItem(itemId);
      if (!item) return { success: false, reason: "item_not_found" };

      // Check if client is provided for role items
      if (item.type === "role" && (!guildId || !client)) {
        return { success: false, reason: "guild_or_client_required" };
      }

      const profile = await economy.getProfile(userId);
      if (!profile) return { success: false, reason: "no_profile" };

      // ตรวจสอบเงิน
      if (profile.balance < item.price) {
        return { success: false, reason: "insufficient_funds" };
      }

      const now = Date.now();

      // ลบไอเทมที่หมดอายุก่อน
      await this.cleanupExpiredItems(userId);

      let newItem;

      // ตรวจสอบไอเทมซ้ำและการ stack สำหรับไอเทมชั่วคราว
      if (item.type === "temporary") {
        const sameItems = profile.inventory.filter(
          (i) => i.id === itemId && (!i.expiresAt || i.expiresAt > now)
        );
        if (sameItems.length >= 4) {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ ไม่สามารถซื้อไอเทมได้')
            .setDescription(`คุณมี ${item.name} มากเกินไปแล้ว!`)
            .addFields(
              { name: '📦 จำนวนที่มีอยู่', value: `${sameItems.length}/5 ชิ้น`, inline: true },
              { name: '⚠️ คำแนะนำ', value: 'กรุณารอไอเทมหมดอายุก่อนซื้อเพิ่ม' }
            )
            .setTimestamp();

          return { 
            success: false, 
            reason: "max_stack_reached",
            embed: embed 
          };
        }

        // ตรวจสอบว่ามีไอเทมที่กำลังใช้งานอยู่หรือไม่
        const hasActiveItem = sameItems.some(i => i.active);

        // หาเวลาหมดอายุล่าสุดของไอเทมประเภทเดียวกัน
        let latestExpiry = now;

        if (sameItems.length > 0) {
          const expiryTimes = sameItems
            .map((i) => i.expiresAt)
            .filter((time) => time && time > now);
          if (expiryTimes.length > 0) {
            latestExpiry = Math.max(...expiryTimes);
          }
        }

        newItem = {
          id: itemId,
          active: !hasActiveItem,
          expiresAt: latestExpiry + item.duration,
        };

        // เพิ่มไอเทมใหม่ลงในกระเป๋า
        profile.inventory.push(newItem);
      }
      // ตรวจสอบไอเทมซ้ำสำหรับไอเทมถาวร
      else if (item.type === "permanent" || item.type === "role") {
        const hasItem = profile.inventory?.some(
          (i) => i.id === itemId && (!i.expiresAt || i.expiresAt > Date.now())
        );
        if (hasItem) {
          return { success: false, reason: "already_owned" };
        }

        newItem = {
          id: itemId,
          active: true,
        };
        
        profile.inventory.push(newItem);
      }

      
      

      // ตั้งเวลาหมดอายุถ้าเป็นไอเทมชั่วคราว
      if (item.duration) {
        newItem.expiresAt = now + item.duration;
      }

      // Handle role items
      if (item.type === "role" && item.roleId) {
        try {
          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(userId);
          await member.roles.add(item.roleId);
        } catch (error) {
          console.error("Error adding role:", error);
          return { success: false, reason: "role_add_failed" };
        }
      }

      // หักเงิน
      profile.balance -= item.price;

      // บันทึกโปรไฟล์
      await economy.updateProfile(userId, {
        balance: profile.balance,
        inventory: profile.inventory,
      });

      return { success: true, item, newBalance: profile.balance };

      // ...rest of existing buyItem code...
    } catch (error) {
      console.error("Shop error:", error);
      return { success: false, reason: "system_error" };
    }
  }

  async checkEffects(userId) {
    const profile = await economy.getProfile(userId);
    if (!profile?.inventory) return {};

    await this.cleanupExpiredItems(userId);

    const effects = {
      gambling_luck: 0,
      work_bonus: 0,
      xp_boost: 0,
      money_boost: 0,
      income_boost: 0,
      fee_reduction: 0,
    };

    const now = Date.now();

    // ตรวจสอบและรวมผลของไอเทมที่ใช้งานอยู่
    for (const inventoryItem of profile.inventory) {
      const item = this.findItem(inventoryItem.id);
      if (!item || !inventoryItem.active) continue;

      // ข้ามไอเทมที่หมดอายุ
      if (inventoryItem.expiresAt && inventoryItem.expiresAt < now) {
        continue;
      }

      // รวมผลของไอเทม
      if (item.effect && typeof item.effect === "object") {
        for (const [effectType, value] of Object.entries(item.effect)) {
          effects[effectType] = (effects[effectType] || 0) + value;
        }
      }
    }

    return effects;
  }

  async useItem(userId, itemId) {
    const profile = await economy.getProfile(userId);
    if (!profile?.inventory) return { success: false, reason: "no_inventory" };

    const itemIndex = profile.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return { success: false, reason: "item_not_found" };

    await this.cleanupExpiredItems(userId);

    const inventoryItem = profile.inventory[itemIndex];
    const item = this.findItem(itemId);

    if (!item) return { success: false, reason: "invalid_item" };

    // ตรวจสอบการหมดอายุ
    if (inventoryItem.expiresAt && inventoryItem.expiresAt < Date.now()) {
      return { success: false, reason: "expired" };
    }

    // อัพเดทสถานะการใช้งาน
    inventoryItem.active = !inventoryItem.active;
    await economy.updateProfile(userId, { inventory: profile.inventory });

    return {
      success: true,
      item,
      active: inventoryItem.active,
      expiresAt: inventoryItem.expiresAt,
    };
  }
}

module.exports = new ShopSystem();
