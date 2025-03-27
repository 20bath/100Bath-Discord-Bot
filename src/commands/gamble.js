const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GambleSystem = require('../utils/gambleSystem');
const EconomySystem = require('../utils/economySystem');
const levelSystem = require('../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('ระบบการพนัน')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('เล่นเกมทายลูกเต๋า สูง/ต่ำ')
                .addIntegerOption(option =>
                    option
                        .setName('bet')
                        .setDescription('จำนวนเงินเดิมพัน')
                        .setRequired(true)
                        .setMinValue(100)
                )
                .addStringOption(option =>
                    option
                        .setName('choice')
                        .setDescription('ทายสูง(4-6) หรือ ต่ำ(1-3)')
                        .setRequired(true)
                        .addChoices(
                            { name: '📈 สูง (4-6)', value: 'high' },
                            { name: '📉 ต่ำ (1-3)', value: 'low' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blackjack')
                .setDescription('เล่นเกมแบล็คแจ็ค')
                .addIntegerOption(option =>
                    option
                        .setName('bet')
                        .setDescription('จำนวนเงินเดิมพัน')
                        .setRequired(true)
                        .setMinValue(100)
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const bet = interaction.options.getInteger('bet');
            
            // ตรวจสอบลิมิตการเดิมพันตามเลเวล
            const level = await levelSystem.getLevel(interaction.user.id);
            const base = 5000
            const maxBet = Math.floor(base + (level * 500));

            if (bet > maxBet) {
                return interaction.reply({
                    content: `❌ เลเวลปัจจุบันของคุณสามารถเดิมพันได้สูงสุด ${maxBet} บาท`,
                    flags: ['Ephemeral']
                });
            }

            switch (subcommand) {
                case 'dice': {
                    // ตรวจสอบ cooldown
                    const cooldown = await EconomySystem.checkCooldown(interaction.user.id, 'gamble');
                    if (cooldown > 0) {
                        return interaction.reply({
                            content: `⏰ กรุณารอ ${Math.ceil(cooldown / 1000)} วินาที`,
                            flags: ['Ephemeral']
                        });
                    }

                    const bet = interaction.options.getInteger('bet');
                    const choice = interaction.options.getString('choice');

                    // เล่นเกมทายลูกเต๋า
                    const result = await GambleSystem.playDice(interaction.user.id, bet, choice);

                    if (!result.success) {
                        return interaction.reply({
                            content: '❌ ยอดเงินไม่เพียงพอ',
                            flags: ['Ephemeral']
                        });
                    }

                    // สร้าง embed แสดงผล
                    const embed = new EmbedBuilder()
                        .setTitle('🎲 ไฮโล')
                        .setColor(result.won ? '#00ff00' : '#ff0000')
                        .addFields(
                            {
                                name: '🎲 ผล',
                                value: `${getDiceEmoji(result.roll)} (${result.roll})`,
                                inline: true
                            },
                            {
                                name: '🎯 ทาย',
                                value: choice === 'high' ? '📈 สูง (4-6)' : '📉 ต่ำ (1-3)',
                                inline: true
                            },
                            {
                                name: '💰 ผลลัพธ์',
                                value: result.won ? '🎉 ชนะ!' : '😢 แพ้',
                                inline: true
                            },
                            {
                                name: result.won ? '💸 ได้รับ' : '💸 เสีย',
                                value: `${result.won ? result.winAmount : bet} บาท`,
                                inline: true
                            },
                            {
                                name: '💵 ยอดเงินคงเหลือ',
                                value: `${result.newBalance} บาท`,
                                inline: true
                            }
                        )
                        .setFooter({ text: '💡 อัตราจ่าย: ชนะ x1.9 เท่า' })
                        .setTimestamp();

                    // ตั้ง cooldown 5 วินาที
                    await EconomySystem.setCooldown(interaction.user.id, 'gamble', 5000);

                    await interaction.reply({ embeds: [embed] });
                    break;
                }
                case 'blackjack': {
                    const bet = interaction.options.getInteger('bet');
                    const game = await GambleSystem.startBlackjack(interaction.user.id, bet);
                
                    if (!game.success) {
                        return interaction.reply({
                            content: '❌ ยอดเงินไม่เพียงพอ',
                            flags: ['Ephemeral']
                        });
                    }
                
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('hit')
                                .setLabel('🎯 Hit')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('stand')
                                .setLabel('🛑 Stand')
                                .setStyle(ButtonStyle.Danger)
                        );
                
                    const embed = createBlackjackEmbed(game, bet);
                    
                    // Update to use newer method
                    const message = await interaction.reply({
                        embeds: [embed],
                        components: [row]
                    });
                
                    const collector = message.createMessageComponentCollector({
                        filter: i => i.user.id === interaction.user.id,
                        time: 30000
                    });
                
                    collector.on('collect', async i => {
                        try {
                            if (i.customId === 'hit') {
                                const result = await GambleSystem.hitBlackjack(interaction.user.id);
                                
                                // Handle null result
                                if (!result) {
                                    await i.update({
                                        content: '❌ เกิดข้อผิดพลาดในการเล่นเกม',
                                        embeds: [],
                                        components: []
                                    });
                                    collector.stop();
                                    return;
                                }
                
                                if (result.status === 'playing') {
                                    await i.update({
                                        embeds: [createBlackjackEmbed(result, bet)],
                                        components: [row]
                                    });
                                } else {
                                    await i.update({
                                        embeds: [createBlackjackEndEmbed(result)],
                                        components: []
                                    });
                                    collector.stop();
                                }
                            } else if (i.customId === 'stand') {
                                const result = await GambleSystem.standBlackjack(interaction.user.id);
                                
                                // Handle null result
                                if (!result) {
                                    await i.update({
                                        content: '❌ เกิดข้อผิดพลาดในการเล่นเกม',
                                        embeds: [],
                                        components: []
                                    });
                                    collector.stop();
                                    return;
                                }
                
                                await i.update({
                                    embeds: [createBlackjackEndEmbed(result)],
                                    components: []
                                });
                                collector.stop();
                            }
                        } catch (error) {
                            console.error('Error in blackjack interaction:', error);
                            await i.update({
                                content: '❌ เกิดข้อผิดพลาดในการเล่นเกม',
                                embeds: [],
                                components: []
                            }).catch(console.error);
                            collector.stop();
                        }
                    });
                
                    collector.on('end', () => {
                        // Clean up the message when the collector ends
                        if (message) {
                            interaction.editReply({
                                components: []
                            }).catch(console.error);
                        }
                    });
                
                    break;
                }
            }
        } catch (error) {
            console.error('Error in gamble command:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการเล่นเกม กรุณาลองใหม่อีกครั้ง',
                flags: ['Ephemeral']
            });
        }
    }
};

// Helper function for dice emojis
function getDiceEmoji(number) {
    try {
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return diceEmojis[number - 1];
    } catch (error) {
        console.error('Error in getDiceEmoji:', error);
    }
}

function createBlackjackEmbed(game, bet) {
    try {
    return new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setColor('#0099ff')
        .addFields(
            {
                name: '🎮 ไพ่ของคุณ',
                value: GambleSystem.formatHand(game.playerHand) + ` (${game.playerTotal})`,
                inline: true
            },
            {
                name: '🎰 ไพ่เจ้ามือ',
                value: GambleSystem.formatHand(game.dealerHand, true),
                inline: true
            },
            {
                name: '💰 เดิมพัน',
                value: `${bet} บาท`,
                inline: true
            }
        )
        .setFooter({ text: '💡 Hit เพื่อจั่วไพ่เพิ่ม, Stand เพื่อหยุด' });
    } catch (error) {
        console.error('Error in createBlackjackEmbed:', error);
    }
}

function createBlackjackEndEmbed(result) {
    try {
    const getStatusText = (status) => {
        switch (status) {
            case 'blackjack': return '🎉 แบล็คแจ็ค!';
            case 'win': return '🎉 ชนะ!';
            case 'lose': return '😢 แพ้';
            case 'bust': return '💥 เกิน 21!';
            case 'push': return '🤝 เสมอ';
            default: return 'ไม่ทราบผล';
        }
    };

    return new EmbedBuilder()
        .setTitle('🃏 Blackjack - ผลการเล่น')
        .setColor(result.won ? '#00ff00' : '#ff0000')
        .addFields(
            {
                name: '🎮 ไพ่ของคุณ',
                value: GambleSystem.formatHand(result.playerHand) + ` (${result.playerTotal})`,
                inline: true
            },
            {
                name: '🎰 ไพ่เจ้ามือ',
                value: GambleSystem.formatHand(result.dealerHand) + ` (${result.dealerTotal})`,
                inline: true
            },
            {
                name: '💰 ผลการเล่น',
                value: getStatusText(result.status),
                inline: false
            },
            {
                name: result.won ? '💸 ได้รับ' : '💸 เสีย',
                value: `${result.won ? result.winAmount : result.bet} บาท`,
                inline: true
            },
            {
                name: '💵 ยอดเงินคงเหลือ',
                value: `${result.newBalance} บาท`,
                inline: true
            }
        )
        .setFooter({ text: '💡 Blackjack จ่าย 2.5 เท่า, ชนะปกติจ่าย 2 เท่า' });
    } catch (error) {
        console.error('Error in createBlackjackEndEmbed:', error);
    }
}