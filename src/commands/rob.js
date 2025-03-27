const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomySystem = require('../utils/economySystem');

const ROB_CONFIG = {
    COOLDOWN: 3600000, // 1 hour cooldown
    MIN_MONEY_TO_ROB: 500, // ต้องมีเงินขั้นต่ำถึงจะปล้นได้
    SUCCESS_RATE: 40, // 40% โอกาสสำเร็จ
    MAX_STEAL_PERCENT: 30, // ปล้นได้สูงสุด 30% ของเงินในกระเป๋า
    FINE_PERCENT: 50 // ค่าปรับ 50% ของเงินที่พยายามจะปล้น
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('ปล้นเงินจากผู้เล่นอื่น')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('ผู้เล่นที่ต้องการปล้น')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const robber = interaction.user;
            const target = interaction.options.getUser('target');

            // ตรวจสอบการปล้นตัวเอง
            if (robber.id === target.id) {
                return interaction.reply({
                    content: '❌ คุณไม่สามารถปล้นตัวเองได้',
                    flags: ['Ephemeral']
                });
            }

            // ตรวจสอบการปล้นบอท
            if (target.bot) {
                return interaction.reply({
                    content: '❌ คุณไม่สามารถปล้นบอทได้',
                    flags: ['Ephemeral']
                });
            }

            // ตรวจสอบ cooldown
            const cooldown = await EconomySystem.checkCooldown(robber.id, 'rob');
            if (cooldown > 0) {
                const minutes = Math.ceil(cooldown / 60000);
                return interaction.reply({
                    content: `⏰ คุณต้องรอ ${minutes} นาที ก่อนจะปล้นอีกครั้ง`,
                    flags: ['Ephemeral']
                });
            }

            // ดึงข้อมูลผู้เล่นทั้งสองฝ่าย
            const robberProfile = await EconomySystem.getProfile(robber.id);
            const targetProfile = await EconomySystem.getProfile(target.id);

            // ตรวจสอบเงินขั้นต่ำของเป้าหมาย
            if (targetProfile.balance < ROB_CONFIG.MIN_MONEY_TO_ROB) {
                return interaction.reply({
                    content: '❌ เป้าหมายมีเงินน้อยเกินไป ไม่คุ้มที่จะปล้น',
                    flags: ['Ephemeral']
                });
            }

            // คำนวณจำนวนเงินที่จะปล้น
            const maxSteal = Math.floor(targetProfile.balance * (ROB_CONFIG.MAX_STEAL_PERCENT / 100));
            const stealAmount = Math.floor(Math.random() * maxSteal) + 1;

            // สุ่มความสำเร็จ
            const success = Math.random() * 100 < ROB_CONFIG.SUCCESS_RATE;

            if (success) {
                // ปล้นสำเร็จ
                await EconomySystem.addMoney(robber.id, stealAmount);
                await EconomySystem.addMoney(target.id, -stealAmount);

                const embed = new EmbedBuilder()
                    .setTitle('🦹 ปล้นสำเร็จ!')
                    .setColor('#00ff00')
                    .setDescription(`คุณปล้น ${target.username} สำเร็จ!`)
                    .addFields(
                        { 
                            name: '💰 จำนวนเงินที่ปล้นได้',
                            value: `${stealAmount} บาท`,
                            inline: true
                        },
                        {
                            name: '💵 ยอดเงินปัจจุบัน',
                            value: `${robberProfile.balance + stealAmount} บาท`,
                            inline: true
                        }
                    )
                    .setFooter({ text: '💡 เงินในธนาคารจะปลอดภัยจากการปล้น' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                // ปล้นไม่สำเร็จ
                const fine = Math.floor(stealAmount * (ROB_CONFIG.FINE_PERCENT / 100));
                await EconomySystem.addMoney(robber.id, -fine);

                const embed = new EmbedBuilder()
                    .setTitle('🚔 ปล้นไม่สำเร็จ!')
                    .setColor('#ff0000')
                    .setDescription(`คุณพยายามจะปล้น ${target.username} แต่ไม่สำเร็จ!`)
                    .addFields(
                        {
                            name: '💸 ค่าปรับ',
                            value: `${fine} บาท`,
                            inline: true
                        },
                        {
                            name: '💵 ยอดเงินคงเหลือ',
                            value: `${robberProfile.balance - fine} บาท`,
                            inline: true
                        }
                    )
                    .setFooter({ text: '😢 โชคไม่ดี โดนจับได้ซะแล้ว' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // ตั้ง cooldown
            await EconomySystem.setCooldown(robber.id, 'rob', ROB_CONFIG.COOLDOWN);

        } catch (error) {
            console.error('Error in rob command:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการปล้น',
                flags: ['Ephemeral']
            });
        }
    },
};