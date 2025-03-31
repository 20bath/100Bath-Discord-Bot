const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ShopSystem = require("../utils/shopSystem");
const EconomySystem = require("../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("ร้านค้าไอเทมและยศพิเศษ (ยังใช้งานสินค้าไม่ได้)"),

  async execute(interaction) {
    try {
      const profile = await EconomySystem.getProfile(interaction.user.id);

      // สร้าง embed หลัก
      const embed = new EmbedBuilder()
        .setTitle("🏪 ร้านค้า")
        .setColor("#ffd700")
        .setDescription("เลือกหมวดหมู่สินค้าที่ต้องการ")
        .addFields({
          name: "💰 ยอดเงินของคุณ",
          value: `${profile.balance} บาท`,
          inline: true,
        });

      // สร้าง select menu สำหรับหมวดหมู่
      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId("shop_category")
        .setPlaceholder("เลือกหมวดหมู่")
        .addOptions([
          {
            label: "อุปกรณ์ถาวร",
            description: "ไอเทมที่ใช้ได้ตลอด",
            value: "permanent",
            emoji: "🛡️",
          },
          {
            label: "ไอเทมชั่วคราว",
            description: "ไอเทมที่มีระยะเวลาจำกัด",
            value: "temporary",
            emoji: "⏳",
          },
          {
            label: "ยศพิเศษ",
            description: "ยศที่มีสิทธิพิเศษ",
            value: "roles",
            emoji: "👑",
          },
            {
                label: "ซื้อเพชร",
                description: "ร้านค้าเพชรสำหรับกาชา",
                value: "gems",
                emoji: "💎",
            },
        ]);

      const row = new ActionRowBuilder().addComponents(categorySelect);
      const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      // สร้าง collector สำหรับ select menu
      const collector = response.createMessageComponentCollector({
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "❌ คุณไม่สามารถใช้เมนูนี้ได้",
            ephemeral: true,
          });
        }

        if (i.customId === "shop_category") {
          const category = i.values[0];
          const categoryInfo = ShopSystem.getCategoryInfo()[category];

          if (category === "gems") {
            const gemsEmbed = new EmbedBuilder()
              .setTitle("💎 ร้านค้าเพชรกาชา")
              .setColor("#2b2d31")
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
              .setStyle(ButtonStyle.Secondary);

            await i.update({
              embeds: [gemsEmbed],
              files: ["./src/Assets/PromptPay/promptpay.jpg"],
              components: [new ActionRowBuilder().addComponents(backButton)]
            });
            return;
          }

          const items = ShopSystem.getShopItems()[category];
          if (!items) {
            await i.reply({ 
              content: "❌ ไม่พบรายการสินค้าในหมวดหมู่นี้",
              ephemeral: true 
            });
            return;
          }

          const categoryEmbed = new EmbedBuilder()
            .setTitle(`🏪 ร้านค้า - ${getCategoryName(category)}`)
            .setColor("#ffd700")
            .setDescription(categoryInfo.description)
            .addFields(
              {
                name: "💰 ยอดเงินของคุณ",
                value: `${profile.balance} บาท`,
                inline: true,
              },
              {
                name: "📦 รายการสินค้า",
                value: "```\nเลือกสินค้าด้านล่างเพื่อดูรายละเอียด\n```",
                inline: false,
              }
            );

          // Add item details to embed
          Object.values(items).forEach((item) => {
            categoryEmbed.addFields({
              name: item.name,
              value: ShopSystem.getItemDetails(item),
              inline: true,
            });
          });

          // เพิ่มคำอธิบายเพิ่มเติมตามประเภท
          if (category === "permanent") {
            categoryEmbed.addFields({
              name: "📝 หมายเหตุ",
              value:
                "• ไอเทมถาวรสามารถใช้ได้ตลอด\n• เปิดใช้งานอัตโนมัติหลังซื้อ\n• ซื้อได้เพียงชิ้นเดียวต่อประเภท",
              inline: false,
            });
          } else if (category === "temporary") {
            categoryEmbed.addFields({
              name: "⚠️ คำเตือน",
              value:
                "• ไอเทมจะเริ่มนับเวลาเมื่อเปิดใช้งาน\n• สามารถซื้อได้สูงสุด 5 ชิ้น / ไอเท็ม\n• หมดอายุตามเวลาที่กำหนด",
              inline: false,
            });
          } else if (category === "roles") {
            categoryEmbed.addFields({
              name: "👑 สิทธิพิเศษ",
              value:
                "• ได้รับยศทันทีหลังซื้อ\n• มีผลบวกพิเศษหลายอย่าง\n• แสดงสถานะพิเศษในเซิร์ฟเวอร์",
              inline: false,
            });
          } else if (category === "gems") {
            const gemsEmbed = new EmbedBuilder()
              .setTitle("💎 ร้านค้าเพชรกาชา")
              .setColor("#2b2d31")
              .setDescription(categoryInfo.description)
              .setImage("attachment://promptpay.jpg")
              .addFields(
                {
                  name: "💰 อัตราแลกเปลี่ยน",
                  value:
                    "```\n1 บาท = 1 เพชร\n50 บาท = 50 เพชร + 5 โบนัส\n100 บาท = 100 เพชร + 15 โบนัส\n500 บาท = 500 เพชร + 100 โบนัส\n```",
                  inline: false,
                },
                {
                  name: "💎 เพชรของคุณ",
                  value: `${profile.gems?.common || 0} เพชร`,
                  inline: true,
                }
              )
              .setFooter({ text: "เพชรจะถูกเพิ่มเข้าบัญชีภายใน 24 ชั่วโมง" });

            
            return;
          }

          // สร้างปุ่มสำหรับแต่ละไอเทม
          const buttons = Object.values(items).map((item) => {
            return new ButtonBuilder()
              .setCustomId(`buy_${item.id}`)
              .setLabel(
                `ซื้อ ${item.name} (${item.price.toLocaleString()} บาท)`
              )
              .setStyle(ButtonStyle.Primary)
              .setDisabled(profile.balance < item.price);
          });

          // จัดกลุ่มปุ่ม (สูงสุด 5 ปุ่มต่อแถว)
          const buttonRows = [];
          for (let i = 0; i < buttons.length; i += 5) {
            buttonRows.push(
              new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
            );
          }

          // เพิ่มปุ่มกลับ
          const backButton = new ButtonBuilder()
            .setCustomId("shop_back")
            .setLabel("กลับไปหน้าหลัก")
            .setStyle(ButtonStyle.Secondary);

          buttonRows.push(new ActionRowBuilder().addComponents(backButton));

          await i.update({
            embeds: [categoryEmbed],
            components: buttonRows,
          });
        } else if (i.customId.startsWith("buy_")) {
          const itemId = i.customId.replace("buy_", "");
          const result = await ShopSystem.buyItem(
            i.user.id,
            itemId,
            interaction.guildId,
            interaction.client // Pass the client instance
          );

          if (!result.success) {
            const errorMessages = {
              insufficient_funds: "❌ ยอดเงินไม่เพียงพอ",
              already_owned: "❌ คุณมีไอเทมนี้อยู่แล้ว",
              item_not_found: "❌ ไม่พบไอเทมนี้",
              role_add_failed: "❌ ไม่สามารถเพิ่มยศได้ กรุณาติดต่อแอดมิน",
              guild_or_client_required: "❌ ไม่สามารถซื้อยศได้ในขณะนี้",
            };

            await i.reply({
              content: errorMessages[result.reason] || "❌ เกิดข้อผิดพลาด",
              ephemeral: true,
            });
            return;
          }

          // แสดงผลการซื้อ
          const successEmbed = new EmbedBuilder()
            .setTitle("✅ ซื้อสำเร็จ!")
            .setColor("#00ff00")
            .addFields(
              {
                name: "🎁 ไอเทม",
                value: result.item.name,
                inline: true,
              },
              {
                name: "💰 ราคา",
                value: `${result.item.price} บาท`,
                inline: true,
              },
              {
                name: "💵 ยอดเงินคงเหลือ",
                value: `${result.newBalance} บาท`,
                inline: true,
              }
            );

          await i.reply({
            embeds: [successEmbed],
            ephemeral: true,
          });
        } else if (i.customId === "shop_back") {
          await i.update({
            embeds: [embed],
            components: [row],
          });
        }
      });

      collector.on("end", () => {
        interaction.editReply({
          components: [],
        });
      });
    } catch (error) {
      console.error("Shop error:", error);
      await interaction.reply({
        content: "❌ เกิดข้อผิดพลาดในการใช้งานร้านค้า",
        ephemeral: true,
      });
    }
  },
};

function getCategoryName(category) {
  const names = {
    permanent: "🛡️ อุปกรณ์ถาวร",
    temporary: "⏳ ไอเทมชั่วคราว",
    roles: "👑 ยศพิเศษ",
    gems: "💎 เพชรกาชา",
  };
  return names[category] || category;
}
