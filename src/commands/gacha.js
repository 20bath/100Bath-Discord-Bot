const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const GachaSystem = require("../utils/gachaSystem");
const economy = require("../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gacha")
    .setDescription("สุ่มกาชาด้วย 100BathGem")
    .addSubcommand((subcommand) =>
      subcommand.setName("pull").setDescription("สุ่มกาชา 1 ครั้ง")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("info").setDescription("ดูข้อมูลอัตราการดรอปและรางวัล")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "info") {
      const infoEmbed = new EmbedBuilder()
        .setTitle("💫 100Bath Gacha System")
        .setColor("#2b2d31")
        .setDescription(
          `
                ━━━━━━━━━ System Info ━━━━━━━━━
                💎 **Cost per Pull:** ${GachaSystem.costPerPull} Gems
                🎯 **Pity System:**
                • SSR guaranteed at ${GachaSystem.pitySystem.SSR} pulls
                • SR guaranteed every ${GachaSystem.pitySystem.SR} pulls
        
                ━━━━━━━━━ Drop Rates ━━━━━━━━━
                \`\`\`
                ⭐⭐⭐ SSR | 0.5% | Exclusive Role
                ⭐⭐ SR   | 3.5% | Permanent Item
                ⭐ R     | 9.0% | Temporary Boost
                ⚪ N     | 87.0% | Common Item
                \`\`\`
        
                ━━━━━━━━━ Rewards ━━━━━━━━━
                **[SSR] 👮 ตำรวจ**
                • ลดโอกาสถูกปล้น 30% (ถาวร)
                **[SSR] 🦹‍♂️ โจร**
                •ลดคูลดาวน์ปล้น 20%
                •โอกาสทำเงินตกลดลง 10%
                •เพิ่มโอกาสการปล้น 15% (ถาวร)
                
                **[SR] 🔫 ปืนเถื่อน**
                • เพิ่มโอกาสปล้นสำเร็จ 10% (ถาวร)
                
                **[R] 💫 Small Boost**
                • เพิ่มรายได้ 5% (1 ชั่วโมง)
                
                **[N] 🗑️ ขยะ**
                • แลกเงิน 100 บาท`
        )
        .setFooter({
          text: "พิมพ์ /gacha pull เพื่อสุ่ม • System v1.0",
        })
        .setTimestamp();

      return interaction.reply({ embeds: [infoEmbed] });
    }

    if (subcommand === "pull") {
      await interaction.deferReply();

      const result = await GachaSystem.pull(
        interaction.user.id,
        interaction.client,
        interaction.guildId
      );

      if (!result.success) {
        const errorMessages = {
          insufficient_gems: `❌ เพชรไม่พอ (ต้องการ ${GachaSystem.costPerPull} เม็ด, มี ${result.current} เม็ด)`,
          role_add_failed: "❌ ไม่สามารถเพิ่มยศได้ กรุณาติดต่อแอดมิน",
          system_error: "❌ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
        };

        return interaction.editReply({
          content: errorMessages[result.reason] || "❌ เกิดข้อผิดพลาด",
        });
      }

      const embed = GachaSystem.createPullEmbed(result);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
