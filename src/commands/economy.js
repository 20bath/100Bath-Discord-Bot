const { EmbedBuilder } = require('discord.js');
const EconomySystem = require('../utils/economySystem');
const ShopSystem = require('../utils/shopSystem');
const GamblingGames = require('../games/gamblingGames');

module.exports = {
    name: 'economy',
    description: 'คำสั่งระบบเศรษฐกิจ',
    requiresDatabase: true,
    options: [
        {
            name: 'claim',
            description: 'รับรางวัล',
            type: 1,
            options: [
                {
                    name: 'type',
                    description: 'ประเภทรางวัล',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '📅 รายวัน', value: 'daily' },
                        { name: '📅 รายสัปดาห์', value: 'weekly' },
                        { name: '📅 รายเดือน', value: 'monthly' }
                    ]
                }
            ]
        },
        {
            name: 'gamble',
            description: 'เล่นเกมพนัน',
            type: 1,
            options: [
                {
                    name: 'game',
                    description: 'เลือกเกม',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '🎲 Blackjack', value: 'blackjack' },
                        { name: '🎯 Coinflip', value: 'coinflip' },
                        { name: '🎲 Dice', value: 'dice' },
                        { name: '🎰 Slots', value: 'slots' },
                        { name: '🎯 Dart Throw', value: 'dart' },
                        { name: '🔢 Number Guess', value: 'number' },
                        { name: '✂️ Rock Paper Scissors', value: 'rps' },
                        { name: '💣 Minesweeper', value: 'mine' }
                    ]
                },
                {
                    name: 'amount',
                    description: 'จำนวนเงินที่จะเดิมพัน',
                    type: 4,
                    required: true,
                    min_value: 100
                }
            ]
        },
        {
            name: 'work',
            description: 'ทำงานเพื่อรับเงิน',
            type: 1
        },
        {
            name: 'profile',
            description: 'ดูข้อมูลโปรไฟล์',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: 'ผู้ใช้ที่ต้องการดู (ไม่ระบุ = ตัวเอง)',
                    type: 6,
                    required: false
                }
            ]
        }
    ],
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'claim': {
                    const type = interaction.options.getString('type');
                    const result = await EconomySystem.claimReward(
                        interaction.user.id,
                        interaction.guild.id,
                        type
                    );

                    if (result.success) {
                        const embed = new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle(`💰 รางวัล${type}`)
                            .setDescription(`${interaction.user} คุณได้รับรางวัลแล้ว!`)
                            .addFields(
                                { name: '💵 ได้รับ', value: `${result.reward.coins} เหรียญ`, inline: true },
                                { name: '💎 โบนัส', value: `${result.reward.gems} เพชร`, inline: true }
                            )
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] });
                    } else {
                        const timeLeft = Math.ceil(result.timeRemaining / (1000 * 60 * 60));
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⏰ คูลดาวน์')
                            .setDescription(`คุณต้องรออีก ${timeLeft} ชั่วโมง`)
                            .setFooter({ text: 'ลองกลับมาใหม่ในภายหลัง' });

                        return await interaction.editReply({ embeds: [embed] });
                    }
                }

                case 'work': {
                    const result = await EconomySystem.work(
                        interaction.user.id,
                        interaction.guild.id
                    );

                    if (result.success) {
                        const embed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('💼 ทำงานสำเร็จ!')
                            .setDescription(`${interaction.user} คุณได้ทำงานเสร็จแล้ว`)
                            .setThumbnail(interaction.user.displayAvatarURL())
                            .addFields(
                                { name: '💵 ได้รับ', value: `${result.earnedCoins} เหรียญ`, inline: true }
                            )
                            .setFooter({ text: 'ทำงานต่อได้ในอีก 1 ชั่วโมง' })
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] });
                    } else {
                        const minutes = Math.ceil(result.timeRemaining / (1000 * 60));
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⏰ คูลดาวน์')
                            .setDescription(`คุณต้องรออีก ${minutes} นาทีก่อนทำงานอีกครั้ง`)
                            .setFooter({ text: 'พักผ่อนสักครู่...' });

                        return await interaction.editReply({ embeds: [embed] });
                    }
                }

                case 'gamble': {
                    const amount = interaction.options.getInteger('amount');
                    const game = interaction.options.getString('game');
                    
                    const userData = await EconomySystem.getUserData(interaction.user.id, interaction.guild.id);
                    if (userData.coins < amount) {
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ เงินไม่พอ')
                            .setDescription('คุณมีเหรียญไม่พอสำหรับการเดิมพันนี้');
                        return await interaction.editReply({ embeds: [embed] });
                    }

                    let result;
                    switch (game) {
                        case 'blackjack':
                            result = await GamblingGames.playBlackjack(interaction, amount);
                            break;
                        case 'coinflip':
                            result = await GamblingGames.playCoinflip(interaction, amount);
                            break;
                        case 'dice':
                            result = await GamblingGames.playDice(interaction, amount);
                            break;
                        case 'slots':
                            result = await GamblingGames.playSlots(interaction, amount);
                            break;
                        case 'rps':
                            result = await GamblingGames.playRPS(interaction, amount);
                            break;
                        case 'number':
                            result = await GamblingGames.playNumberGuess(interaction, amount);
                            break;
                        case 'dart':
                            result = await GamblingGames.playDartThrow(interaction, amount);
                            break;
                        case 'mine':
                            result = await GamblingGames.playMinesweeper(interaction, amount);
                            break;
                        default:
                            const embed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ เกมไม่พร้อมใช้งาน')
                                .setDescription('ขออภัย เกมนี้ยังไม่พร้อมใช้งาน');
                            return await interaction.editReply({ embeds: [embed] });
                    }

                    // เพิ่มการตรวจสอบ result ก่อนอัพเดทเงิน
                    if (result && typeof result.amount !== 'undefined') {
                        await EconomySystem.updateBalance(
                            interaction.user.id,
                            interaction.guild.id,
                            result.amount,
                            0,
                            'gambling'
                        );

                        // อัพเดทสถิติการพนัน
                        if (result.won) {
                            await EconomySystem.updateGamblingStats(
                                interaction.user.id,
                                interaction.guild.id,
                                true
                            );
                        } else {
                            await EconomySystem.updateGamblingStats(
                                interaction.user.id,
                                interaction.guild.id,
                                false
                            );
                        }
                    }

                    return; // ไม่ต้อง reply ซ้ำเพราะมีการ reply ในเกมแล้ว
                }

                case 'inventory': {
                    const userData = await EconomySystem.getUserData(interaction.user.id, interaction.guild.id);
                    if (!userData.inventory || userData.inventory.length === 0) {
                        const embed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('🎒 กระเป๋าของคุณ')
                            .setDescription('คุณยังไม่มีไอเทมใดๆ')
                            .setThumbnail(interaction.user.displayAvatarURL());
                        return await interaction.editReply({ embeds: [embed] });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🎒 กระเป๋าของคุณ')
                        .setThumbnail(interaction.user.displayAvatarURL());

                    // จัดกลุ่มไอเทมตามประเภท
                    const items = userData.inventory.reduce((acc, item) => {
                        const itemData = ShopSystem.getItemData(item.id);
                        if (!acc[itemData.type]) acc[itemData.type] = [];
                        acc[itemData.type].push({
                            ...itemData,
                            purchasedAt: item.purchasedAt
                        });
                        return acc;
                    }, {});

                    if (items.role) {
                        embed.addFields({
                            name: '👑 ยศ VIP',
                            value: items.role.map(item => 
                                `${item.name}\n` +
                                `┗ ซื้อเมื่อ: ${new Date(item.purchasedAt).toLocaleString()}`
                            ).join('\n\n')
                        });
                    }

                    if (items.consumable) {
                        embed.addFields({
                            name: '🎮 ไอเทมใช้งาน',
                            value: items.consumable.map(item =>
                                `${item.name}\n` +
                                `┣ ${item.description}\n` +
                                `┗ ซื้อเมื่อ: ${new Date(item.purchasedAt).toLocaleString()}`
                            ).join('\n\n')
                        });
                    }

                    return await interaction.editReply({ embeds: [embed] });
                }

                case 'use': {
                    const itemId = interaction.options.getString('item');
                    const result = await EconomySystem.useItem(
                        interaction.user.id,
                        interaction.guild.id,
                        itemId
                    );

                    if (result.success) {
                        const embed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✨ ใช้ไอเทมสำเร็จ!')
                            .setDescription(`คุณได้ใช้ ${result.item.name}`)
                            .addFields(
                                { name: '📝 ผลลัพธ์', value: result.message }
                            )
                            .setFooter({ text: 'ไอเทมถูกใช้งานแล้ว' })
                            .setTimestamp();

                        return await interaction.editReply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ เกิดข้อผิดพลาด')
                            .setDescription(`ไม่สามารถใช้ไอเทมได้: ${result.reason}`);

                        return await interaction.editReply({ embeds: [embed] });
                    }
                }
            }
        } catch (error) {
            console.error('Error in economy command:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ เกิดข้อผิดพลาด')
                .setDescription('กรุณาลองใหม่อีกครั้ง');
            return await interaction.editReply({ embeds: [embed] });
        }
    }
};