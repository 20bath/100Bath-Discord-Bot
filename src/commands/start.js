const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economy = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('เริ่มต้นใช้งานระบบเศรษฐกิจ'),

    async execute(interaction) {
        try {
            // Check if user already has a profile
            const existingProfile = await economy.getProfile(interaction.user.id);
            if (existingProfile && existingProfile.createdAt) {
                return interaction.reply({
                    content: '❌ คุณมีโปรไฟล์อยู่แล้ว! ใช้คำสั่ง `/profile` เพื่อดูข้อมูลของคุณ',
                    ephemeral: true
                });
            }

            // Create new profile
            const profile = await economy.createProfile(interaction.user.id);

            // Create welcome embed
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎉 ยินดีต้อนรับสู่ระบบเศรษฐกิจ!')
                .setColor('#2ecc71')
                .setDescription('ระบบได้สร้างโปรไฟล์ให้คุณเรียบร้อยแล้ว\nมาทำความรู้จักกับระบบต่างๆ กัน!')
                .addFields(
                    { 
                        name: '💰 เริ่มต้นการทำงาน', 
                        value: '```/work``` ทำงานเพื่อหาเงิน\n```/inventory``` ดูไอเทมที่มี\n```/shop``` ร้านค้าไอเทมและยศพิเศษ' 
                    },
                    { 
                        name: '🏦 ระบบธนาคาร', 
                        value: '```/bank deposit``` ฝากเงิน\n```/bank withdraw``` ถอนเงิน\n```/bank interest``` รับดอกเบี้ย' 
                    },
                    {
                        name: '🎲 ระบบการพนัน',
                        value: '```/gamble dice``` เล่นไฮโล\n```/gamble blackjack``` เล่นแบล็คแจ็ค'
                    },
                    {
                        name: '👥 ระบบโซเชียล',
                        value: '```/transfer``` โอนเงินให้ผู้เล่นอื่น\n```/rob``` ขโมยเงินผู้เล่นอื่น (เสี่ยง)'
                    }
                )
                .setFooter({ 
                    text: 'พิมพ์ /tutorial เพื่อเรียนรู้วิธีการเล่นเกมนี้' 
                });

            // Create guide buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('guide_work')
                        .setLabel('🔧 วิธีการทำงาน')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('guide_bank')
                        .setLabel('🏦 ระบบธนาคาร')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('guide_gamble')
                        .setLabel('🎲 ระบบการพนัน')
                        .setStyle(ButtonStyle.Primary)
                );

            const response = await interaction.reply({
                embeds: [welcomeEmbed],
                components: [buttons],
                fetchReply: true
            });

            // Create button collector
            const collector = response.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '❌ กรุณาใช้คำสั่ง /start เพื่อดูคู่มือของคุณเอง',
                        ephemeral: true
                    });
                }

                const guideEmbeds = {
                    guide_work: new EmbedBuilder()
                        .setTitle('🔧 คู่มือการทำงาน')
                        .setColor('#3498db')
                        .setDescription(
                            '**วิธีการทำงาน**\n' +
                            '1. ใช้คำสั่ง `/work` เพื่อดูอาชีพที่มี\n' +
                            '2. เลือกอาชีพที่ต้องการ (แต่ละอาชีพต้องการเลเวลที่ต่างกัน)\n' +
                            '3. ทำงานเพื่อรับเงินและไอเทมพิเศษ\n' +
                            '4. เลเวลอาชีพจะเพิ่มขึ้นเมื่อทำงาน ยิ่งเลเวลสูง ยิ่งได้เงินมาก!\n\n' +
                            '**ไอเทมจากการทำงาน**\n' +
                            '• ไอเทมที่ได้สามารถขายเพื่อรับเงินเพิ่ม\n' +
                            '• ใช้คำสั่ง `/sell` เพื่อขายไอเทม\n' +
                            '• `/sell all` เพื่อขายไอเทมทั้งหมด'
                        ),
                    guide_bank: new EmbedBuilder()
                        .setTitle('🏦 คู่มือระบบธนาคาร')
                        .setColor('#f1c40f')
                        .setDescription(
                            '**ระบบธนาคาร**\n' +
                            '• ฝากเงินเพื่อรับดอกเบี้ยทุก 1 ชั่วโมง\n' +
                            '• ยิ่งมีเงินในธนาคารมาก ยิ่งได้ดอกเบี้ยมาก\n' +
                            '• ลิมิตธนาคารจะเพิ่มขึ้นตามเลเวล\n\n' +
                            '**คำสั่งที่เกี่ยวข้อง**\n' +
                            '• `/bank deposit` - ฝากเงิน\n' +
                            '• `/bank withdraw` - ถอนเงิน\n' +
                            '• `/bank interest` - รับดอกเบี้ย\n' +
                            '• `/bank info` - ดูข้อมูลธนาคาร'
                        ),
                    guide_gamble: new EmbedBuilder()
                        .setTitle('🎲 คู่มือระบบการพนัน')
                        .setColor('#e74c3c')
                        .setDescription(
                            '**ระบบการพนัน**\n' +
                            '• เล่นไฮโลด้วย `/gamble dice`\n' +
                            '• เล่นแบล็คแจ็คด้วย `/gamble blackjack`\n' +
                            '• สามารถใช้ไอเทมเพิ่มโชคได้\n\n' +
                            '**คำเตือน**\n' +
                            '• เล่นพนันมีความเสี่ยงที่จะเสียเงิน\n' +
                            '• ควรเล่นในจำนวนที่เหมาะสม\n' +
                            '• ใช้ไอเทมเสริมโชคเพื่อเพิ่มโอกาสชนะ'
                        )
                };

                await i.reply({
                    embeds: [guideEmbeds[i.customId]],
                    ephemeral: true
                });
            });

            collector.on('end', () => {
                if (response.editable) {
                    const buttons = response.components[0].components;
                    buttons.forEach(button => button.setDisabled(true));
                    response.edit({ components: [new ActionRowBuilder().addComponents(buttons)] });
                }
            });

        } catch (error) {
            console.error('Error in start command:', error);
            return interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการสร้างโปรไฟล์',
                ephemeral: true
            });
        }
    }
};