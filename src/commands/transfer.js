const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const EconomySystem = require("../utils/economySystem");

const TRANSFER_LIMITS = {
  MIN_AMOUNT: 100, // จำนวนเงินขั้นต่ำที่โอนได้
  MAX_AMOUNT: 10000, // จำนวนเงินสูงสุดที่โอนได้ต่อครั้ง
  COOLDOWN: 300000, // 5 นาทีต่อครั้ง
  FEE_PERCENT: 5, // ค่าธรรมเนียม 5%
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("โอนเงินให้ผู้เล่นอื่น")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("ผู้เล่นที่ต้องการโอนเงินให้")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("จำนวนเงินที่ต้องการโอน")
        .setRequired(true)
        .setMinValue(TRANSFER_LIMITS.MIN_AMOUNT)
        .setMaxValue(TRANSFER_LIMITS.MAX_AMOUNT)
    ),

  async execute(interaction) {
    try {
      const sender = interaction.user;
      const receiver = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");

      // ตรวจสอบการโอนให้ตัวเอง
      if (sender.id === receiver.id) {
        return interaction.reply({
          content: "❌ ไม่สามารถโอนเงินให้ตัวเองได้",
          flags: ["Ephemeral"],
        });
      }

      // ตรวจสอบการโอนให้บอท
      if (receiver.bot) {
        return interaction.reply({
          content: "❌ ไม่สามารถโอนเงินให้บอทได้",
          flags: ["Ephemeral"],
        });
      }

      // ตรวจสอบ cooldown
      const cooldown = await EconomySystem.checkCooldown(sender.id, "transfer");
      if (cooldown > 0) {
        const minutes = Math.ceil(cooldown / 60000);
        return interaction.reply({
          content: `⏰ กรุณารอ ${minutes} นาที ก่อนโอนเงินอีกครั้ง`,
          flags: ["Ephemeral"],
        });
      }

      // คำนวณค่าธรรมเนียม
      const fee = Math.floor(amount * (TRANSFER_LIMITS.FEE_PERCENT / 100));
      const totalAmount = amount + fee;

      // ตรวจสอบยอดเงินผู้โอน
      const senderProfile = await EconomySystem.getProfile(sender.id);
      if (!senderProfile || senderProfile.balance < totalAmount) {
        return interaction.reply({
          content: `❌ ยอดเงินไม่เพียงพอ (ต้องการ ${totalAmount} บาท รวมค่าธรรมเนียม ${fee} บาท)`,
          flags: ["Ephemeral"],
        });
      }

      // ดำเนินการโอนเงิน
      await EconomySystem.addMoney(sender.id, -totalAmount);
      await EconomySystem.addMoney(receiver.id, amount);

      // บันทึกสถิติการโอน
      await EconomySystem.updateProfile(sender.id, {
        "stats.transferStats.sent.total":
          senderProfile.stats.transferStats.sent.total + amount,
        "stats.transferStats.sent.count":
          senderProfile.stats.transferStats.sent.count + 1,
        "stats.transferStats.sent.largest": Math.max(
          senderProfile.stats.transferStats.sent.largest,
          amount
        ),
        "stats.transferStats.sent.fees":
          senderProfile.stats.transferStats.sent.fees + fee,
        "stats.totalLost": senderProfile.stats.totalLost + fee,
      });

      // บันทึกสถิติการรับ
      const receiverProfile = await EconomySystem.getProfile(receiver.id);
      await EconomySystem.updateProfile(receiver.id, {
        "stats.transferStats.received.total":
          receiverProfile.stats.transferStats.received.total + amount,
        "stats.transferStats.received.count":
          receiverProfile.stats.transferStats.received.count + 1,
        "stats.transferStats.received.largest": Math.max(
          receiverProfile.stats.transferStats.received.largest,
          amount
        ),
      });

      // สร้าง embed แสดงผล
      const embed = new EmbedBuilder()
        .setTitle("💸 การโอนเงินสำเร็จ")
        .setColor("#00ff00")
        .addFields(
          {
            name: "👤 ผู้โอน",
            value: sender.username,
            inline: true,
          },
          {
            name: "👥 ผู้รับ",
            value: receiver.username,
            inline: true,
          },
          {
            name: "💰 จำนวนเงิน",
            value: `${amount} บาท`,
            inline: true,
          },
          {
            name: "💵 ค่าธรรมเนียม",
            value: `${fee} บาท (${TRANSFER_LIMITS.FEE_PERCENT}%)`,
            inline: true,
          },
          {
            name: "💳 ยอดรวมที่ถูกหัก",
            value: `${totalAmount} บาท`,
            inline: true,
          }
        )
        .setTimestamp();

      // ตั้ง cooldown
      await EconomySystem.setCooldown(
        sender.id,
        "transfer",
        TRANSFER_LIMITS.COOLDOWN
      );

      // ส่งผลลัพธ์
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error in transfer command:", error);
      await interaction.reply({
        content: "❌ เกิดข้อผิดพลาดในการโอนเงิน",
        flags: ["Ephemeral"],
      });
    }
  },
};
