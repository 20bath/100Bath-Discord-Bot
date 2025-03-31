const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GachaSystem = require('../utils/gachaSystem');
const economy = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gacha')
        .setDescription('สุ่มกาชาด้วย 100BathGem')
        .addSubcommand(subcommand =>
            subcommand
                .setName('pull')
                .setDescription('สุ่มกาชา 1 ครั้ง')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('ดูข้อมูลอัตราการดรอปและรางวัล')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'info') {
            const infoEmbed = new EmbedBuilder()
                .setTitle('🎰 ข้อมูลกาชา')
                .setColor('#00ff00')
                .setDescription('```\nใช้ 100BathGem ในการสุ่มเพื่อรับรางวัลสุดพิเศษ!\n```')
                .addFields(
                    {
                        name: '💎 ราคา',
                        value: `${GachaSystem.costPerPull} 100BathGem ต่อการสุ่ม 1 ครั้ง`,
                        inline: false
                    },
                    {
                        name: '📊 อัตราการดรอป',
                        value: 
                        '```\n' +
                        'SSR (ยศพิเศษ)     : 0.5%\n' +
                        'SR (ไอเทมถาวร)     : 3.5%\n' +
                        'R (ไอเทมชั่วคราว)   : 9%\n' +
                        'N (ขยะ)           : 87%\n' +
                        '```',
                        inline: false
                    },
                    {
                        name: '🎁 รางวัล',
                        value: 
                        '```\n' +
                        'SSR - ยศตำรวจ (ลดโอกาสถูกปล้น 30%)\n' +
                        'SR - ปืนเถื่อน (เพิ่มโอกาสปล้นสำเร็จ 10%)\n' +
                        'R - บูสต์รายได้ (เพิ่มรายได้ 5% 1 ชั่วโมง)\n' +
                        'N - ขยะ (แลกเงิน 100 บาท)\n' +
                        '```',
                        inline: false
                    }
                )
                .setFooter({ text: 'ใช้คำสั่ง /gacha pull เพื่อสุ่ม' });

            return interaction.reply({ embeds: [infoEmbed] });
        }

        if (subcommand === 'pull') {
            await interaction.deferReply();

            const result = await GachaSystem.pull(
                interaction.user.id,
                interaction.client,
                interaction.guildId
            );

            if (!result.success) {
                const errorMessages = {
                    insufficient_gems: `❌ เพชรไม่พอ (ต้องการ ${GachaSystem.costPerPull} เม็ด, มี ${result.current} เม็ด)`,
                    role_add_failed: '❌ ไม่สามารถเพิ่มยศได้ กรุณาติดต่อแอดมิน',
                    system_error: '❌ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
                };

                return interaction.editReply({
                    content: errorMessages[result.reason] || '❌ เกิดข้อผิดพลาด',
                });
            }

            const embed = GachaSystem.createPullEmbed(result);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};