const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const bankSystem = require('../utils/bankSystem.js');
const levelSystem = require('../utils/levelSystem');
const EconomySystem = require('../utils/economySystem');


// อัตราดอกเบี้ย 1% ต่อชั่วโมง
// ต้องมีเงินฝากขั้นต่ำ 1,000 บาท
// ดอกเบี้ยสูงสุด 10,000 บาทต่อครั้ง
// จ่ายดอกเบี้ยทุก 1 ชั่วโมง
// แสดงเวลาที่เหลือก่อนได้รับดอกเบี้ยครั้งต่อไป
// เก็บสถิติดอกเบี้ยที่ได้รับทั้งหมด

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('ระบบธนาคาร')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('ฝากเงินเข้าธนาคาร')
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('จำนวนเงินที่ต้องการฝาก')
                        .setRequired(true)
                        .setMinValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('ถอนเงินจากธนาคาร')
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('จำนวนเงินที่ต้องการถอน')
                        .setRequired(true)
                        .setMinValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('ตรวจสอบยอดเงินในธนาคาร')
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'deposit': {
                    const amount = interaction.options.getInteger('amount');
                    
                    // ตรวจสอบ cooldown
                    const cooldown = await EconomySystem.checkCooldown(interaction.user.id, 'bank');
                    if (cooldown > 0) {
                        return interaction.reply({
                            content: `⏰ กรุณารอ ${Math.ceil(cooldown / 1000)} วินาที`,
                            flags: ['Ephemeral']
                        });
                    }

                    // ดำเนินการฝากเงิน
                    const result = await bankSystem.deposit(interaction.user.id, amount);

                    if (!result.success) {
                        const errorMessages = {
                            'insufficient_funds': '❌ ยอดเงินในกระเป๋าไม่เพียงพอ',
                            'bank_limit': '❌ เกินลิมิตเงินฝากของธนาคาร',
                            'no_profile': '❌ ไม่พบข้อมูลผู้เล่น'
                        };
                        return interaction.reply({
                            content: errorMessages[result.reason] || '❌ เกิดข้อผิดพลาดในการฝากเงิน',
                            flags: ['Ephemeral']
                        });
                    }

                    // สร้าง embed แสดงผล
                    const embed = new EmbedBuilder()
                        .setTitle('🏦 ฝากเงินสำเร็จ')
                        .setColor('#00ff00')
                        .addFields(
                            {
                                name: '💰 จำนวนเงินที่ฝาก',
                                value: `${amount} บาท`,
                                inline: true
                            },
                            {
                                name: '💵 ยอดเงินในกระเป๋า',
                                value: `${result.newBalance} บาท`,
                                inline: true
                            },
                            {
                                name: '🏦 ยอดเงินในธนาคาร',
                                value: `${result.newBankBalance} บาท`,
                                inline: true
                            }
                        )
                        .setFooter({ text: '💡 เงินในธนาคารจะปลอดภัยจากการปล้น' })
                        .setTimestamp();

                    // ตั้ง cooldown 10 วินาที
                    await EconomySystem.setCooldown(interaction.user.id, 'bank', 10000);

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'withdraw': {
                    const amount = interaction.options.getInteger('amount');
                    
                    // ตรวจสอบ cooldown
                    const cooldown = await EconomySystem.checkCooldown(interaction.user.id, 'bank');
                    if (cooldown > 0) {
                        return interaction.reply({
                            content: `⏰ กรุณารอ ${Math.ceil(cooldown / 1000)} วินาที`,
                            flags: ['Ephemeral']
                        });
                    }

                    // ดำเนินการถอนเงิน
                    const result = await bankSystem.withdraw(interaction.user.id, amount);

                    if (!result.success) {
                        const errorMessages = {
                            'insufficient_funds': '❌ ยอดเงินในธนาคารไม่เพียงพอ',
                            'no_profile': '❌ ไม่พบข้อมูลผู้เล่น'
                        };
                        return interaction.reply({
                            content: errorMessages[result.reason] || '❌ เกิดข้อผิดพลาดในการถอนเงิน',
                            flags: ['Ephemeral']
                        });
                    }

                    // สร้าง embed แสดงผล
                    const embed = new EmbedBuilder()
                        .setTitle('🏦 ถอนเงินสำเร็จ')
                        .setColor('#00ff00')
                        .addFields(
                            {
                                name: '💰 จำนวนเงินที่ถอน',
                                value: `${amount} บาท`,
                                inline: true
                            },
                            {
                                name: '💵 ยอดเงินในกระเป๋า',
                                value: `${result.newBalance} บาท`,
                                inline: true
                            },
                            {
                                name: '🏦 ยอดเงินในธนาคาร',
                                value: `${result.newBankBalance} บาท`,
                                inline: true
                            }
                        )
                        .setFooter({ text: '💡 ระวัง! เงินในกระเป๋าอาจถูกปล้นได้' })
                        .setTimestamp();

                    // ตั้ง cooldown 10 วินาที
                    await EconomySystem.setCooldown(interaction.user.id, 'bank', 10000);

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'balance': {
                    const profile = await EconomySystem.getProfile(interaction.user.id);
                    const level = await levelSystem.getLevel(interaction.user.id);
                    const nextLevelLimit = 10000 + ((level + 1) * 1000);
                
                    // Process interest
                    const interestResult = await bankSystem.processInterest(interaction.user.id);
                    let interestField = '';
                    
                    if (interestResult.success && interestResult.amount) {
                        interestField = `\n💰 ดอกเบี้ยที่ได้รับ: ${interestResult.amount} บาท`;
                    } else if (interestResult.timeRemaining) {
                        const minutesRemaining = Math.ceil(interestResult.timeRemaining / 60000);
                        interestField = `\n⏰ ดอกเบี้ยรอบถัดไป: ${minutesRemaining} นาที`;
                    }
                
                    const embed = new EmbedBuilder()
                        .setTitle('🏦 ข้อมูลบัญชีธนาคาร')
                        .setColor('#0099ff')
                        .addFields(
                            {
                                name: '💰 ยอดเงินในธนาคาร',
                                value: `${profile.bankBalance} บาท${interestField}`,
                                inline: true
                            },
                            {
                                name: '💵 ยอดเงินในกระเป๋า',
                                value: `${profile.balance} บาท`,
                                inline: true
                            },
                            {
                                name: '📊 ลิมิตเงินฝาก',
                                value: `${profile.bankLimit} บาท\n⬆️ เลเวลถัดไป: ${nextLevelLimit} บาท`,
                                inline: true
                            },
                            {
                                name: '📈 สถิติการใช้งานธนาคาร',
                                value: 
                                    `ฝากเงินรวม: ${profile.stats.bankStats.totalDeposits} บาท\n` +
                                    `ฝากครั้งสูงสุด: ${profile.stats.bankStats.largestDeposit} บาท\n` +
                                    `ดอกเบี้ยรวม: ${profile.stats.bankStats.totalInterestEarned || 0} บาท\n` +
                                    `เลเวลปัจจุบัน: ${level}`,
                                inline: false
                            }
                        )
                        .setFooter({ 
                            text: `💡 ฝากเงินขั้นต่ำ ${EconomySystem.INTEREST_CONFIG.MIN_BALANCE} บาท เพื่อรับดอกเบี้ย ${EconomySystem.INTEREST_CONFIG.RATE * 100}% ทุกชั่วโมง` 
                        })
                        .setTimestamp();
                
                    await interaction.reply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error('Error in bank command:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการใช้งานธนาคาร',
                flags: ['Ephemeral']
            });
        }
    },
};