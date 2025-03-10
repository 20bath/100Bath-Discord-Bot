const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, Modal, TextInputComponent } = require('discord.js');

class GamblingGames {
    // Blackjack
    static async playBlackjack(interaction, bet) {
        try {
            const deck = this.createDeck();
            const playerHand = [this.drawCard(deck), this.drawCard(deck)];
            const dealerHand = [this.drawCard(deck), this.drawCard(deck)];
            let playerTotal = this.calculateHand(playerHand);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎲 Blackjack')
                .addFields(
                    { name: '🎭 เจ้ามือ', value: `${dealerHand[0]} | ?`, inline: true },
                    { name: '👤 ผู้เล่น', value: `${playerHand.join(' | ')} (${playerTotal})`, inline: true },
                    { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hit')
                        .setLabel('จั่วไพ่')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎯'),
                    new ButtonBuilder()
                        .setCustomId('stand')
                        .setLabel('หยุด')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️')
                );

            const message = await interaction.editReply({ 
                embeds: [embed], 
                components: [row] 
            });

            return new Promise(async (resolve) => {
                const filter = i => i.user.id === interaction.user.id;
                const collector = message.createMessageComponentCollector({ 
                    filter, 
                    time: 30000 
                });

                collector.on('collect', async (i) => {
                    try {
                        if (i.customId === 'hit') {
                            const newCard = this.drawCard(deck);
                            if (!newCard) {
                                collector.stop('nodeck');
                                return;
                            }
                            playerHand.push(newCard);
                            playerTotal = this.calculateHand(playerHand);

                            if (playerTotal > 21) {
                                collector.stop('bust');
                            } else {
                                embed.setFields(
                                    { name: '🎭 เจ้ามือ', value: `${dealerHand[0]} | ?`, inline: true },
                                    { name: '👤 ผู้เล่น', value: `${playerHand.join(' | ')} (${playerTotal})`, inline: true },
                                    { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true }
                                );
                                await i.update({ embeds: [embed], components: [row] });
                            }
                        } else if (i.customId === 'stand') {
                            collector.stop('stand');
                        }
                    } catch (error) {
                        console.error('Error in collector:', error);
                        collector.stop('error');
                    }
                });

                collector.on('end', async (collected, reason) => {
                    try {
                        let dealerTotal = this.calculateHand(dealerHand);
                        
                        // เจ้ามือจั่วไพ่ถ้าแต้มน้อยกว่า 17
                        if (reason === 'stand') {
                            while (dealerTotal < 17) {
                                const newCard = this.drawCard(deck);
                                if (!newCard) break;
                                dealerHand.push(newCard);
                                dealerTotal = this.calculateHand(dealerHand);
                            }
                        }

                        let result;
                        if (reason === 'bust' || playerTotal > 21) {
                            result = { won: false, amount: -bet };
                        } else if (reason === 'nodeck' || reason === 'error') {
                            result = { won: false, amount: 0 }; // คืนเงินเดิมพัน
                        } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                            result = { won: true, amount: bet * 2 };
                        } else if (playerTotal < dealerTotal) {
                            result = { won: false, amount: -bet };
                        } else {
                            result = { won: false, amount: 0 }; // เสมอ
                        }

                        embed
                            .setFields(
                                { name: '🎭 เจ้ามือ', value: `${dealerHand.join(' | ')} (${dealerTotal})`, inline: true },
                                { name: '👤 ผู้เล่น', value: `${playerHand.join(' | ')} (${playerTotal})`, inline: true },
                                { name: '💰 ผลลัพธ์', value: result.won ? `ชนะ ${result.amount} เหรียญ` : 
                                                          result.amount === 0 ? 'เสมอ' : 
                                                          `แพ้ ${Math.abs(result.amount)} เหรียญ`, inline: true }
                            )
                            .setColor(result.won ? '#00ff00' : result.amount === 0 ? '#ffff00' : '#ff0000');

                        await interaction.editReply({ 
                            embeds: [embed], 
                            components: [] 
                        });
                        
                        resolve(result);
                    } catch (error) {
                        console.error('Error in end collector:', error);
                        resolve({ won: false, amount: 0 });
                    }
                });
            });
        } catch (error) {
            console.error('Error in blackjack:', error);
            return { won: false, amount: 0 };
        }
    }

    // Coinflip
    static async playCoinflip(interaction, bet) {
        const choices = ['heads', 'tails'];
        const playerChoice = choices[Math.floor(Math.random() * choices.length)];
        const result = choices[Math.floor(Math.random() * choices.length)];
        const won = playerChoice === result;

        const embed = new EmbedBuilder()
            .setColor(won ? '#00ff00' : '#ff0000')
            .setTitle('🎲 Coinflip')
            .setDescription(`คุณเลือก: ${playerChoice === 'heads' ? 'หัว 🪙' : 'ก้อย 💫'}\n` +
                          `ผลที่ได้: ${result === 'heads' ? 'หัว 🪙' : 'ก้อย 💫'}`)
            .addFields(
                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                { name: '💸 ผลลัพธ์', value: won ? `ชนะ +${bet * 2}` : `แพ้ -${bet}`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
        return { won, amount: won ? bet * 2 : -bet };
    }

    // Slots
    static async playSlots(interaction, bet) {
        const symbols = ['7️⃣', '💎', '🍒', '🍊', '🍇', '🍎'];
        const slots = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        // สร้างภาพ slot machine
        const slotsDisplay = 
            `╔══╦══╦══╗\n` +
            `║${slots[0]}║${slots[1]}║${slots[2]}║\n` +
            `╚══╩══╩══╝`;

        // ตรวจสอบการชนะ
        let winMultiplier = 0;
        if (slots[0] === slots[1] && slots[1] === slots[2]) {
            // ได้ไลน์เดียวกันทั้งหมด
            winMultiplier = slots[0] === '7️⃣' ? 10 : // 777 = x10
                          slots[0] === '💎' ? 7 :  // 💎💎💎 = x7
                          5; // สัญลักษณ์อื่นๆ = x5
        } else if (slots[0] === slots[1] || slots[1] === slots[2]) {
            // ได้ 2 ตัวติดกัน
            winMultiplier = 2;
        }

        const winAmount = bet * winMultiplier;
        const won = winAmount > 0;

        const embed = new EmbedBuilder()
            .setColor(won ? '#00ff00' : '#ff0000')
            .setTitle('🎰 Slots')
            .setDescription(`${slotsDisplay}`)
            .addFields(
                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                { name: '💸 ผลลัพธ์', value: won ? `ชนะ +${winAmount}` : `แพ้ -${bet}`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
        return { won, amount: won ? winAmount : -bet };
    }

    // Dice
    static async playDice(interaction, bet) {
        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const botRoll = Math.floor(Math.random() * 6) + 1;
        const won = playerRoll > botRoll;

        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const embed = new EmbedBuilder()
            .setColor(won ? '#00ff00' : playerRoll === botRoll ? '#ffff00' : '#ff0000')
            .setTitle('🎲 Dice')
            .setDescription(
                `คุณทอยได้: ${diceEmojis[playerRoll-1]} (${playerRoll})\n` +
                `บอททอยได้: ${diceEmojis[botRoll-1]} (${botRoll})`
            )
            .addFields(
                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                { name: '💸 ผลลัพธ์', value: playerRoll === botRoll ? 'เสมอ' : 
                    won ? `ชนะ +${bet * 2}` : `แพ้ -${bet}`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
        return { 
            won, 
            amount: playerRoll === botRoll ? 0 : won ? bet * 2 : -bet 
        };
    }

    // Rock Paper Scissors
    static async playRPS(interaction, bet) {
        const choices = ['🪨', '📄', '✂️'];
        const buttons = choices.map(choice => 
            new ButtonBuilder()
                .setCustomId(choice)
                .setEmoji(choice)
                .setStyle(ButtonStyle.Primary)
        );

        const row = new ActionRowBuilder().addComponents(buttons);
        const embed = new EmbedBuilder()
            .setTitle('✂️ Rock Paper Scissors')
            .setDescription('เลือกคำตอบของคุณ!');

        const message = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        try {
            const response = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            const playerChoice = response.customId;
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            let won = false;
            if ((playerChoice === '🪨' && botChoice === '✂️') ||
                (playerChoice === '📄' && botChoice === '🪨') ||
                (playerChoice === '✂️' && botChoice === '📄')) {
                won = true;
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(playerChoice === botChoice ? '#ffff00' : won ? '#00ff00' : '#ff0000')
                .setTitle('✂️ Rock Paper Scissors')
                .setDescription(
                    `คุณเลือก: ${playerChoice}\n` +
                    `บอทเลือก: ${botChoice}`
                )
                .addFields(
                    { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                    { name: '💸 ผลลัพธ์', value: playerChoice === botChoice ? 'เสมอ' : 
                        won ? `ชนะ +${bet * 2}` : `แพ้ -${bet}`, inline: true }
                );

            await response.update({ embeds: [resultEmbed], components: [] });
            return {
                won,
                amount: playerChoice === botChoice ? 0 : won ? bet * 2 : -bet
            };
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ หมดเวลา')
                .setDescription('คุณไม่ได้เลือกตัวเลือกในเวลาที่กำหนด');

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
            return { won: false, amount: -bet };
        }
    }

    static createDeck() {
        const suits = ['♠️', '♥️', '♣️', '♦️'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];

        for (const suit of suits) {
            for (const value of values) {
                deck.push(`${value}${suit}`);
            }
        }

        return this.shuffleDeck(deck);
    }

    static shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    static drawCard(deck) {
        return deck.pop();
    }

    static calculateHand(hand) {
        let total = 0;
        let aces = 0;

        for (const card of hand) {
            const value = card.slice(0, -2); // ตัดสัญลักษณ์ไพ่ออก
            if (value === 'A') {
                aces++;
            } else if (['K', 'Q', 'J'].includes(value)) {
                total += 10;
            } else {
                total += parseInt(value);
            }
        }

        for (let i = 0; i < aces; i++) {
            if (total + 11 <= 21) {
                total += 11;
            } else {
                total += 1;
            }
        }

        return total;
    }

    // เพิ่มเกมอื่นๆ ตามต้องการ...

    // Number Guess
    // ในฟังก์ชัน playNumberGuess แก้ไขส่วนที่ใช้ Modal

static async playNumberGuess(interaction, bet) {
    const target = Math.floor(Math.random() * 100) + 1;
    const maxTries = 5;
    let tries = 0;

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔢 Number Guess')
        .setDescription('ทายตัวเลขระหว่าง 1-100\nคุณมี 5 ครั้งในการทาย')
        .addFields(
            { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
            { name: '❓ ครั้งที่เหลือ', value: `${maxTries - tries}`, inline: true }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('guess_1')
                .setLabel('1-25')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('guess_2')
                .setLabel('26-50')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('guess_3')
                .setLabel('51-75')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('guess_4')
                .setLabel('76-100')
                .setStyle(ButtonStyle.Primary)
        );

    const message = await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    try {
        while (tries < maxTries) {
            const buttonResponse = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            // ใช้ช่วงตัวเลขที่ผู้เล่นเลือกเพื่อแสดงปุ่มตัวเลขที่เหมาะสม
            const range = buttonResponse.customId.split('_')[1];
            const min = (range - 1) * 25 + 1;
            const max = range * 25;

            const numberRow = new ActionRowBuilder()
                .addComponents(
                    Array.from({ length: 5 }, (_, i) => {
                        const num = min + i * 5;
                        return new ButtonBuilder()
                            .setCustomId(`num_${num}`)
                            .setLabel(`${num}-${num + 4}`)
                            .setStyle(ButtonStyle.Secondary);
                    })
                );

            await buttonResponse.update({
                embeds: [embed],
                components: [row, numberRow]
            });

            const numberResponse = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            const baseNumber = parseInt(numberResponse.customId.split('_')[1]);
            const finalRow = new ActionRowBuilder()
                .addComponents(
                    Array.from({ length: 5 }, (_, i) => {
                        return new ButtonBuilder()
                            .setCustomId(`final_${baseNumber + i}`)
                            .setLabel(`${baseNumber + i}`)
                            .setStyle(ButtonStyle.Secondary);
                    })
                );

            await numberResponse.update({
                embeds: [embed],
                components: [row, finalRow]
            });

            const finalResponse = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            const guess = parseInt(finalResponse.customId.split('_')[1]);
            tries++;

            if (guess === target) {
                const winMultiplier = Math.max(6 - tries, 1);
                const winAmount = bet * winMultiplier;
                
                embed
                    .setColor('#00ff00')
                    .setDescription(`🎉 ยินดีด้วย! คุณทายถูก\nเลขที่ถูกคือ: ${target}`)
                    .setFields(
                        { name: '🎯 จำนวนครั้งที่ทาย', value: `${tries}`, inline: true },
                        { name: '💰 รางวัล', value: `${winAmount} เหรียญ`, inline: true }
                    );

                await finalResponse.update({ embeds: [embed], components: [] });
                return { won: true, amount: winAmount };
            } else {
                const hint = guess < target ? 'มากกว่านี้ ⬆️' : 'น้อยกว่านี้ ⬇️';
                embed
                    .setDescription(`❌ ไม่ถูก! ${hint}\nเหลือ ${maxTries - tries} ครั้ง`)
                    .setFields(
                        { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                        { name: '❓ ครั้งที่เหลือ', value: `${maxTries - tries}`, inline: true },
                        { name: '🎯 ตัวเลขที่ทาย', value: `${guess}`, inline: true }
                    );

                if (tries < maxTries) {
                    await finalResponse.update({ embeds: [embed], components: [row] });
                } else {
                    embed
                        .setColor('#ff0000')
                        .setDescription(`😢 เสียใจด้วย หมดโอกาสทายแล้ว\nเลขที่ถูกคือ: ${target}`);
                    await finalResponse.update({ embeds: [embed], components: [] });
                }
            }
        }

        return { won: false, amount: -bet };
    } catch (e) {
        const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('⏰ หมดเวลา')
            .setDescription('คุณใช้เวลานานเกินไป');
            
        await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
        });
        return { won: false, amount: -bet };
    }
}

    // Dart Throw
    static async playDartThrow(interaction, bet) {
        const zones = [
            { name: 'Bull\'s Eye 🎯', multiplier: 10, chance: 0.05 },
            { name: 'Triple Ring 🔴', multiplier: 5, chance: 0.15 },
            { name: 'Double Ring 🔵', multiplier: 3, chance: 0.25 },
            { name: 'Outer Ring ⚪', multiplier: 2, chance: 0.35 },
            { name: 'Miss ❌', multiplier: 0, chance: 0.20 }
        ];

        const button = new ButtonBuilder()
            .setCustomId('throw')
            .setLabel('🎯 ขว้างดอกธนู')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎯 Dart Throw')
            .setDescription('กดปุ่มเพื่อขว้างดอกธนู')
            .addFields(
                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                { name: '💰 รางวัล', value: 
                    zones.map(z => `${z.name}: x${z.multiplier}`).join('\n'), 
                    inline: true 
                }
            );

        const message = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        try {
            const response = await message.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                time: 30000
            });

            // สุ่มโซนที่ถูก
            const random = Math.random();
            let cumulativeChance = 0;
            let hitZone;

            for (const zone of zones) {
                cumulativeChance += zone.chance;
                if (random <= cumulativeChance) {
                    hitZone = zone;
                    break;
                }
            }

            const winAmount = bet * hitZone.multiplier;
            const won = hitZone.multiplier > 0;

            const resultEmbed = new EmbedBuilder()
                .setColor(won ? '#00ff00' : '#ff0000')
                .setTitle('🎯 Dart Throw')
                .setDescription(`คุณขว้างโดน: ${hitZone.name}!`)
                .addFields(
                    { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                    { name: '💸 ผลลัพธ์', value: won ? 
                        `ชนะ ${winAmount} เหรียญ (x${hitZone.multiplier})` : 
                        'แพ้!', inline: true }
                );

            await response.update({
                embeds: [resultEmbed],
                components: []
            });

            return { won, amount: won ? winAmount : -bet };

        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⏰ หมดเวลา')
                .setDescription('คุณใช้เวลานานเกินไป');

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
            return { won: false, amount: -bet };
        }
    }

    // Minesweeper
    static async playMinesweeper(interaction, bet) {
        const GRID_SIZE = 5;
        const MINE_COUNT = 5;
        const MAX_MOVES = 5;

        // สร้างกริด
        const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
        let minesPlaced = 0;
        
        // วางระเบิด
        while (minesPlaced < MINE_COUNT) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);
            if (!grid[y][x]) {
                grid[y][x] = true;
                minesPlaced++;
            }
        }

        // สร้างปุ่มสำหรับแต่ละช่อง
        function createButtons(revealed) {
            const rows = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                const row = new ActionRowBuilder();
                for (let x = 0; x < GRID_SIZE; x++) {
                    const button = new ButtonBuilder()
                        .setCustomId(`${x}_${y}`)
                        .setLabel(revealed[y][x] ? (grid[y][x] ? '💣' : '✅') : '?')
                        .setStyle(
                            revealed[y][x] ? 
                                (grid[y][x] ? ButtonStyle.Danger : ButtonStyle.Success) : 
                                ButtonStyle.Secondary
                        )
                        .setDisabled(revealed[y][x]);
                    row.addComponents(button);
                }
                rows.push(row);
            }
            return rows;
        }

        const revealed = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
        let moves = 0;
        let totalWin = 0;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('💣 Minesweeper')
            .setDescription(
                'หลีกเลี่ยงระเบิด! เลือกช่องที่ปลอดภัย\n' +
                `💣 ระเบิด: ${MINE_COUNT} ลูก\n` +
                `🎯 เหลือ: ${MAX_MOVES - moves} ครั้ง`
            )
            .addFields(
                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                { name: '💸 เงินรางวัล', value: `${totalWin} เหรียญ`, inline: true }
            );

        const message = await interaction.editReply({
            embeds: [embed],
            components: createButtons(revealed)
        });

        try {
            while (moves < MAX_MOVES) {
                const response = await message.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 30000
                });

                const [x, y] = response.customId.split('_').map(Number);
                revealed[y][x] = true;
                moves++;

                if (grid[y][x]) {
                    // เจอระเบิด
                    const loseEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('💥 BOOM!')
                        .setDescription('คุณเจอระเบิด!')
                        .addFields(
                            { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                            { name: '💸 แพ้', value: `-${bet} เหรียญ`, inline: true }
                        );

                    // เปิดทุกช่อง
                    for (let y = 0; y < GRID_SIZE; y++) {
                        for (let x = 0; x < GRID_SIZE; x++) {
                            revealed[y][x] = true;
                        }
                    }

                    await response.update({
                        embeds: [loseEmbed],
                        components: createButtons(revealed)
                    });

                    return { won: false, amount: -bet };
                } else {
                    // รอด
                    totalWin += bet * 0.5; // ได้รางวัล 50% ของเดิมพันต่อช่องที่รอด

                    embed
                        .setDescription(
                            'หลีกเลี่ยงระเบิด! เลือกช่องที่ปลอดภัย\n' +
                            `💣 ระเบิด: ${MINE_COUNT} ลูก\n` +
                            `🎯 เหลือ: ${MAX_MOVES - moves} ครั้ง`
                        )
                        .setFields(
                            { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                            { name: '💸 เงินรางวัล', value: `${totalWin} เหรียญ`, inline: true }
                        );

                    if (moves === MAX_MOVES) {
                        // ชนะ - เล่นครบจำนวนครั้ง
                        const winEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('🎉 ยินดีด้วย!')
                            .setDescription('คุณรอดจากระเบิดทั้งหมด!')
                            .addFields(
                                { name: '💰 เดิมพัน', value: `${bet} เหรียญ`, inline: true },
                                { name: '💸 ชนะ', value: `+${totalWin} เหรียญ`, inline: true }
                            );

                        await response.update({
                            embeds: [winEmbed],
                            components: createButtons(revealed)
                        });

                        return { won: true, amount: totalWin };
                    }

                    await response.update({
                        embeds: [embed],
                        components: createButtons(revealed)
                    });
                }
            }
        } catch (e) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⏰ หมดเวลา')
                .setDescription('คุณใช้เวลานานเกินไป');

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
            return { won: false, amount: -bet };
        }
    }
}

module.exports = GamblingGames;