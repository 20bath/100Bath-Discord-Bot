const { Collection } = require("discord.js");
const economy = require("./economySystem");

class ShopSystem {
  constructor() {
    this.items = {
      // อุปกรณ์ถาวร
      permanent: {
        lucky_charm: {
          id: "lucky_charm",
          name: "🍀 Lucky Charm",
          description: "เพิ่มโอกาสชนะพนัน 10%",
          price: 15000,
          type: "permanent",
          effect: { gambling_luck: 0.1 },
        },
        work_badge: {
          id: "work_badge",
          name: "💼 Work Badge",
          description: "เพิ่มรายได้จากการทำงาน 20%",
          price: 20000,
          type: "permanent",
          effect: { work_bonus: 0.2 },
        },
      },
      // ไอเทมชั่วคราว
      temporary: {
        xp_boost: {
          id: "xp_boost",
          name: "⭐ XP Boost",
          description: "เพิ่ม EXP 50% (24 ชั่วโมง)",
          price: 5000,
          duration: 86400000, // 24 hours
          type: "temporary",
          effect: { xp_boost: 0.5 },
        },
        money_boost: {
          id: "money_boost",
          name: "💰 Money Boost",
          description: "เพิ่มรายได้ทั้งหมด 30% (12 ชั่วโมง)",
          price: 7500,
          duration: 43200000, // 12 hours
          type: "temporary",
          effect: { money_boost: 0.3 },
        },
      },
      // ยศพิเศษ
      roles: {
        vip: {
          id: "vip",
          name: "👑 VIP",
          description: "เพิ่มรายได้ 15%, ลดค่าธรรมเนียม 20%",
          price: 50000,
          type: "role",
          roleId: "1353881139122671677",
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
    };
  }

  // Add method to get item details for display
  getItemDetails(item) {
    let details = `💰 ราคา: ${item.price} บาท\n📝 ${item.description}\n`;

    if (item.duration) {
      const hours = item.duration / 3600000;
      details += `⏳ ระยะเวลา: ${hours} ชั่วโมง\n`;
    }

    if (item.effect && typeof item.effect === 'object') {
        details += '✨ ผลของไอเทม:\n';
        for (const [effect, value] of Object.entries(item.effect)) {
            const effectName = this.getEffectName(effect);
            details += `• ${effectName}: +${(value * 100).toFixed(0)}%\n`;
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
    };
    return effectNames[effect] || effect;
  }

  findItem(itemId) {
    try{
    for (const category of Object.values(this.items)) {
      if (itemId in category) {
        return category[itemId];
      }
    }
  }catch(e){
    console.log(e)
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

  async buyItem(userId, itemId, guildId = null) {
    try {
      const item = this.findItem(itemId);
      if (!item) return { success: false, reason: "item_not_found" };

      const profile = await economy.getProfile(userId);
      if (!profile) return { success: false, reason: "no_profile" };

      // ตรวจสอบเงิน
      if (profile.balance < item.price) {
        return { success: false, reason: "insufficient_funds" };
      }

      // ลบไอเทมที่หมดอายุก่อน
      await this.cleanupExpiredItems(userId);

      // ตรวจสอบไอเทมซ้ำสำหรับไอเทมถาวร
      if (item.type === "permanent" || item.type === "role") {
        const hasItem = profile.inventory?.some(
          (i) => i.id === itemId && (!i.expiresAt || i.expiresAt > Date.now())
        );
        if (hasItem) {
          return { success: false, reason: "already_owned" };
        }
      }

      const now = Date.now();
      const newItem = {
        id: itemId,
        active: false,
      };

      // ตั้งเวลาหมดอายุถ้าเป็นไอเทมชั่วคราว
      if (item.duration) {
        newItem.expiresAt = now + item.duration;
      }

      profile.inventory.push(newItem);

      // หักเงิน
      profile.balance -= item.price;

      // บันทึกโปรไฟล์
      await economy.updateProfile(userId, {
        balance: profile.balance,
        inventory: profile.inventory,
      });

      return { success: true, item, newBalance: profile.balance};

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

    const effects = {};
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
      if (item.effect && typeof item.effect === 'object') {
        for (const [effectType, value] of Object.entries(item.effect)) {
            if (effectType in effects) {
                effects[effectType] += value;
            } else {
                effects[effectType] = value;
            }
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
