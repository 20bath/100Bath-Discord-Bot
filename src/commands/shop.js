const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const ShopSystem = require("../utils/shopSystem");
const EconomySystem = require("../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("ร้านค้าไอเทมและยศพิเศษ"),

  async execute(interaction) {
    try {
      const profile = await EconomySystem.getProfile(interaction.user.id);
      
      // แสดงเมนูหลัก
      await showMainMenu(interaction, profile);
      
    } catch (error) {
      console.error("Shop error:", error);
      await interaction.reply({
        content: "❌ เกิดข้อผิดพลาดในการใช้งานร้านค้า",
        ephemeral: true,
      });
    }
  },
};

// แสดงเมนูหลักของร้านค้า
async function showMainMenu(interaction, profile) {
  // สร้าง embed หลัก
  const embed = new EmbedBuilder()
    .setTitle("🏪 ร้านค้า 100 Bath")
    .setColor("#2b2d31")
    .setDescription("เลือกหมวดหมู่สินค้าที่ต้องการดู")
    .addFields({
      name: "💰 ยอดเงินของคุณ",
      value: `${profile.balance.toLocaleString()} บาท`,
      inline: true,
    })
    .setFooter({
      text: "ร้านค้า 100 Bath • เลือกหมวดหมู่เพื่อดูสินค้า",
    })
    .setThumbnail("https://cdn.discordapp.com/attachments/1348498933587152910/1348498933587152915/shop_banner.png");

  // รายการหมวดหมู่
  const categories = ShopSystem.getCategoryInfo();
  const selectOptions = [];

  // สร้าง options สำหรับ select menu
  for (const [categoryId, category] of Object.entries(categories)) {
    selectOptions.push({
      label: category.name,
      description: category.description.split('\n')[0].substring(0, 100),
      value: categoryId,
      emoji: category.emoji,
    });
  }

  // สร้าง select menu
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId("shop_category")
    .setPlaceholder("📂 เลือกหมวดหมู่")
    .addOptions(selectOptions);

  const row = new ActionRowBuilder().addComponents(categorySelect);
  
  const response = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  // สร้าง collector สำหรับ components
  const collector = response.createMessageComponentCollector({
    time: 300000, // 5 นาที
  });

  collector.on("collect", async (i) => {
    // ตรวจสอบว่าเป็นผู้ใช้ที่เรียกคำสั่งหรือไม่
    if (i.user.id !== interaction.user.id) {
      return i.reply({
        content: "❌ คุณไม่สามารถใช้เมนูนี้ได้",
        ephemeral: true,
      });
    }

    // อัพเดทข้อมูลผู้ใช้ล่าสุด
    const updatedProfile = await EconomySystem.getProfile(interaction.user.id);

    if (i.customId === "shop_category") {
      const categoryId = i.values[0];
      await showCategoryItems(i, categoryId, updatedProfile, 0);
    } else if (i.customId.startsWith("buy_")) {
      await handleBuyItem(i, updatedProfile);
    } else if (i.customId === "shop_back") {
      await i.update({
        embeds: [embed],
        components: [row],
      });
    } else if (i.customId.startsWith("page_")) {
      const [_, categoryId, pageStr] = i.customId.split("_");
      const page = parseInt(pageStr);
      await showCategoryItems(i, categoryId, updatedProfile, page);
    }
  });

  collector.on("end", () => {
    // Remove components when collector ends
    interaction.editReply({
      components: [],
    }).catch(console.error);
  });
}

// แสดงรายการสินค้าในหมวดหมู่
async function showCategoryItems(interaction, categoryId, profile, page) {
  const categoryInfo = ShopSystem.getCategoryInfo()[categoryId];
  
  // กรณีเป็นหมวดหมู่พิเศษ (เพชร)
  if (categoryId === "gems") {
    return showGemsShop(interaction, profile);
  }

  // ดึงข้อมูลไอเทมในหมวดหมู่ แบบแบ่งหน้า
  const { items, totalPages, currentPage } = ShopSystem.getItemsForPage(
    categoryId, 
    page, 
    3, // items per page
    profile.balance
  );

  // สร้าง embed
  const embed = new EmbedBuilder()
    .setTitle(`🏪 ${categoryInfo.name}`)
    .setColor(categoryInfo.color || "#2b2d31")
    .setDescription(categoryInfo.description)
    .setThumbnail(categoryInfo.thumbnail || "https://cdn.discordapp.com/attachments/1348498933587152910/1348498933587152915/shop_banner.png")
    .addFields({
      name: "💰 ยอดเงินของคุณ",
      value: `${profile.balance.toLocaleString()} บาท`,
      inline: true,
    });

  // เพิ่มรายละเอียดไอเทม
  if (items.length > 0) {
    // แสดงหน้าปัจจุบัน/ทั้งหมด ถ้ามีมากกว่า 1 หน้า
    if (totalPages > 1) {
      embed.setFooter({
        text: `หน้า ${currentPage + 1}/${totalPages} • ${items.length} รายการ`,
      });
    }
    
    items.forEach((item) => {
      const canAfford = profile.balance >= item.price;
      const priceColor = canAfford ? "GREEN" : "RED";
      
      embed.addFields({
        name: item.name,
        value: ShopSystem.getItemDetails(item),
        inline: false,
      });
    });
  } else {
    embed.addFields({
      name: "❌ ไม่พบรายการสินค้า",
      value: "ไม่มีสินค้าในหมวดหมู่นี้",
      inline: false,
    });
  }

  // เพิ่มโน้ตข้อมูลเพิ่มเติม
  if (categoryInfo.note) {
    embed.addFields({
      name: "📝 หมายเหตุ",
      value: categoryInfo.note,
      inline: false,
    });
  }

  // สร้างปุ่มซื้อสินค้า
  const buttons = [];
  items.forEach((item) => {
    const canAfford = profile.balance >= item.price;
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`buy_${item.id}`)
        .setLabel(`ซื้อ ${item.name}`)
        .setStyle(canAfford ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canAfford)
    );
  });

  // สร้างแถวปุ่ม
  const buttonRows = [];
  if (buttons.length > 0) {
    buttonRows.push(new ActionRowBuilder().addComponents(buttons));
  }

  // สร้างปุ่มนำทาง (pagination)
  const navigationRow = new ActionRowBuilder();
  
  // ปุ่มย้อนกลับ
  const backButton = new ButtonBuilder()
    .setCustomId("shop_back")
    .setLabel("กลับไปหน้าหลัก")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔙");
  
  navigationRow.addComponents(backButton);

  // ปุ่มเลื่อนหน้า (ถ้ามีหลายหน้า)
  if (totalPages > 1) {
    // ปุ่มหน้าก่อนหน้า
    const prevButton = new ButtonBuilder()
      .setCustomId(`page_${categoryId}_${currentPage - 1}`)
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0);
    
    // ปุ่มหน้าถัดไป
    const nextButton = new ButtonBuilder()
      .setCustomId(`page_${categoryId}_${currentPage + 1}`)
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1);
    
    navigationRow.addComponents(prevButton, nextButton);
  }
  
  buttonRows.push(navigationRow);

  // อัพเดท interaction
  await interaction.update({
    embeds: [embed],
    components: buttonRows,
  });
}

// แสดงร้านค้าเพชร
async function showGemsShop(interaction, profile) {
  const categoryInfo = ShopSystem.getCategoryInfo().gems;
  
  const gemsEmbed = new EmbedBuilder()
    .setTitle("💎 ร้านค้าเพชรกาชา")
    .setColor(categoryInfo.color || "#2b2d31")
    .setDescription(categoryInfo.description)
    .setImage("attachment://promptpay.jpg")
    .addFields(
      {
        name: "💎 เพชรของคุณ",
        value: `${profile.gems?.common || 0} เพชร`,
        inline: true
      }
    )
    .setFooter({ text: "เพชรจะถูกเพิ่มเข้าบัญชีภายใน 24 ชั่วโมง" });

  const backButton = new ButtonBuilder()
    .setCustomId("shop_back")
    .setLabel("กลับไปหน้าหลัก")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔙");

  await interaction.update({
    embeds: [gemsEmbed],
    files: ["./src/Assets/PromptPay/promptpay.jpg"],
    components: [new ActionRowBuilder().addComponents(backButton)]
  });
}

// จัดการกระบวนการซื้อสินค้า
async function handleBuyItem(interaction, profile) {
  const itemId = interaction.customId.replace("buy_", "");
  
  const result = await ShopSystem.buyItem(
    interaction.user.id,
    itemId,
    interaction.guildId,
    interaction.client
  );

  if (!result.success) {
    // กรณีมี embed จากระบบ
    if (result.embed) {
      await interaction.reply({
        embeds: [result.embed],
        ephemeral: true,
      });
      return;
    }
    
    // กรณีมีข้อความ error ทั่วไป
    const errorMessages = {
      insufficient_funds: "❌ ยอดเงินไม่เพียงพอ",
      already_owned: "❌ คุณมีไอเทมนี้อยู่แล้ว",
      item_not_found: "❌ ไม่พบไอเทมนี้",
      role_add_failed: "❌ ไม่สามารถเพิ่มยศได้ กรุณาติดต่อแอดมิน",
      guild_or_client_required: "❌ ไม่สามารถซื้อยศได้ในขณะนี้",
      max_stack_reached: "❌ คุณมีไอเทมชนิดนี้ครบจำนวนแล้ว",
    };

    await interaction.reply({
      content: errorMessages[result.reason] || "❌ เกิดข้อผิดพลาด",
      ephemeral: true,
    });
    return;
  }

  // กรณีซื้อสำเร็จ
  const item = result.item;
  const successEmbed = new EmbedBuilder()
    .setTitle("✅ ซื้อสำเร็จ!")
    .setColor("#00ff00")
    .setDescription(`คุณได้ซื้อ **${item.name}** เรียบร้อยแล้ว`)
    .addFields(
      {
        name: "🎁 ไอเทม",
        value: item.name,
        inline: true,
      },
      {
        name: "💰 ราคา",
        value: `${item.price.toLocaleString()} บาท`,
        inline: true,
      },
      {
        name: "💵 ยอดเงินคงเหลือ",
        value: `${result.newBalance.toLocaleString()} บาท`,
        inline: true,
      }
    );

  // เพิ่มคำแนะนำตามประเภทไอเทม
  if (item.type === "temporary") {
    successEmbed.addFields({
      name: "📝 คำแนะนำ",
      value: "คุณสามารถเปิดใช้งานไอเทมได้ที่คำสั่ง `/inventory`",
      inline: false,
    });
  } else if (item.type === "role") {
    successEmbed.addFields({
      name: "👑 ยศพิเศษ",
      value: "ยศของคุณจะถูกเพิ่มโดยอัตโนมัติ",
      inline: false,
    });
  }

  await interaction.reply({
    embeds: [successEmbed],
    ephemeral: true,
  });
  
  // อัพเดทหน้าร้านค้าหลังซื้อ
  const updatedProfile = await EconomySystem.getProfile(interaction.user.id);
  
  // หาหมวดหมู่ของไอเทมที่ซื้อ
  let itemCategory = null;
  for (const [category, items] of Object.entries(ShopSystem.getShopItems())) {
    if (itemId in items) {
      itemCategory = category;
      break;
    }
  }
  
  // ดึงข้อมูลการแสดงผลปัจจุบัน
  const message = await interaction.message;
  if (message && itemCategory) {
    // ตรวจหาเลขหน้าปัจจุบัน
    let currentPage = 0;
    for (const row of message.components) {
      for (const component of row.components) {
        if (component.customId && component.customId.startsWith(`page_${itemCategory}_`)) {
          const pageNumMatch = component.customId.match(/page_\w+_(\d+)/);
          if (pageNumMatch && pageNumMatch[1]) {
            const nearbyPage = parseInt(pageNumMatch[1]);
            // ถ้าเจอปุ่มหน้าถัดไป ให้เอาหน้าปัจจุบัน = หน้าถัดไป - 1
            currentPage = Math.max(0, nearbyPage - 1);
          }
        }
      }
    }
    
    // อัพเดทหน้าร้านค้าด้วยข้อมูลล่าสุด
    await showCategoryItems(interaction, itemCategory, updatedProfile, currentPage);
  }
}

function getCategoryName(category) {
  const categories = ShopSystem.getCategoryInfo();
  return categories[category]?.name || category;
}
