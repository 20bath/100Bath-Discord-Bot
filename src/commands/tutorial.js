const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Register Thai font
registerFont(path.join(__dirname, '../fonts/Sarabun-Regular.ttf'), { family: 'Sarabun' });
registerFont(path.join(__dirname, '../fonts/Sarabun-Bold.ttf'), { family: 'Sarabun-Bold' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setDescription('สอนวิธีการเล่นและการใช้งานระบบต่างๆ'),

    async execute(interaction) {
        const pages = {
            main: new EmbedBuilder()
                .setTitle('🎮 ยินดีต้อนรับสู่ 100Bath Economy!')
                .setColor('#2b2d31')
                .setDescription('```\nเลือกหัวข้อที่ต้องการเรียนรู้จากปุ่มด้านล่าง\n```')
                .addFields(
                    { name: '💰 เริ่มต้นใช้งาน', value: 'เรียนรู้พื้นฐานการเล่นและคำสั่งเบื้องต้น', inline: true },
                    { name: '💼 ระบบอาชีพ', value: 'ทำงานและพัฒนาอาชีพของคุณ', inline: true },
                    { name: '🎲 ระบบการพนัน', value: 'เสี่ยงโชคและเพิ่มความสนุก', inline: true },  
                    { name: '🏦 ระบบธนาคาร', value: 'ฝากเงินและรับดอกเบี้ย', inline: true },
                    { name: '🏆 ระบบความสำเร็จ', value: 'ปลดล็อคความสำเร็จต่างๆ', inline: true },
                    { name: '💎 ระบบเพชรและร้านค้า', value: 'ซื้อไอเทมและอัพเกรด', inline: true }
                )
                .setFooter({ text: 'หน้า 1/6 • คลิกปุ่มด้านล่างเพื่อดูรายละเอียด' }),

            basic: new EmbedBuilder()
                .setTitle('💰 เริ่มต้นใช้งาน')
                .setColor('#00ff00')
                .setDescription('```\nคำสั่งพื้นฐานที่ควรรู้\n```')
                .addFields(
                    { name: '📝 คำสั่งเริ่มต้น', value: '• `/start` - สร้างโปรไฟล์และเริ่มต้นใช้งาน\n• `/profile` - ดูข้อมูลโปรไฟล์\n• `/inventory` - ดูไอเทมที่มี', inline: false },
                    { name: '💹 ระบบเลเวล', value: 'เลเวลจะเพิ่มขึ้นเมื่อทำกิจกรรมต่างๆ\nยิ่งเลเวลสูง ยิ่งปลดล็อคความสามารถมากขึ้น', inline: false },
                    { name: '💡 เคล็ดลับ', value: 'ทำเควสรายวันเพื่อรับรางวัลและเพิ่ม Streak', inline: false }
                ),

            work: new EmbedBuilder()
                .setTitle('💼 ระบบอาชีพ') 
                .setColor('#3498db')
                .setDescription('```\nทำงานเพื่อหาเงินและพัฒนาอาชีพ\n```')
                .addFields(
                    { name: '📋 วิธีการทำงาน', value: '1. `/work info` - ดูรายชื่ออาชีพทั้งหมด\n2. เลือกอาชีพที่เหมาะกับเลเวล\n3. `/work [อาชีพ]` - เริ่มทำงาน', inline: false },
                    { name: '📈 การพัฒนา', value: '• ทำงานเพื่อเพิ่มเลเวลอาชีพ\n• อาชีพเลเวลสูงให้รายได้มากขึ้น\n• มีโอกาสได้ไอเทมพิเศษ', inline: false },
                    { name: '💎 โบนัสพิเศษ', value: 'มีโอกาสได้รับเพชรจากการทำงาน', inline: false }
                ),

            gambling: new EmbedBuilder()
                .setTitle('🎲 ระบบการพนัน')
                .setColor('#e74c3c')
                .setDescription('```\nเสี่ยงโชคเพื่อเพิ่มความสนุก\n```')
                .addFields(
                    { name: '🎮 เกมที่เปิดให้บริการ', value: '• `/gamble blackjack` - เกมไพ่แบล็คแจ็ค\n• `/gamble crash` - เกมเพิ่มตัวคูณ', inline: false },
                    { name: '⚠️ ข้อควรระวัง', value: '• เริ่มต้นด้วยเงินเดิมพันน้อยๆ\n• วงเงินเดิมพันขึ้นอยู่กับเลเวล\n• เล่นด้วยความรับผิดชอบ', inline: false }
                ),

            bank: new EmbedBuilder()
                .setTitle('🏦 ระบบธนาคาร')
                .setColor('#f1c40f')
                .setDescription('```\nฝากเงินเพื่อความปลอดภัยและรับดอกเบี้ย\n```')
                .addFields(
                    { name: '💰 การใช้งานธนาคาร', value: '• `/bank deposit` - ฝากเงิน\n• `/bank withdraw` - ถอนเงิน\n• `/bank balance` - เช็คยอดเงิน', inline: false },
                    { name: '📈 ดอกเบี้ย', value: 'รับดอกเบี้ย 1% ทุกชั่วโมงเมื่อมีเงินฝากขั้นต่ำ 1,000 บาท', inline: false },
                    { name: '🛡️ ความปลอดภัย', value: 'เงินในธนาคารไม่สามารถถูกปล้นได้', inline: false }
                ),

            shop: new EmbedBuilder()
                .setTitle('💎 ระบบเพชรและร้านค้า')
                .setColor('#9b59b6')
                .setDescription('```\nซื้อไอเทมและอัพเกรดความสามารถ\n```')
                .addFields(
                    { name: '💎 การได้รับเพชร', value: '• ทำเควสรายวัน\n• รางวัล Streak\n• โอกาสได้จากการทำงาน', inline: false },
                    { name: '🏪 ร้านค้า', value: '`/shop` เพื่อดูสินค้าทั้งหมด', inline: false },
                    { name: '📦 ประเภทไอเทม', value: '• ไอเทมถาวร - ใช้ได้ตลอด\n• ไอเทมชั่วคราว - มีเวลาหมดอายุ\n• ยศพิเศษ - แสดงสถานะ', inline: false }
                )
        };

        // สร้างปุ่มนำทาง
        const navigation = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('main')
                    .setLabel('หน้าหลัก')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('basic')
                    .setLabel('พื้นฐาน')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('work')
                    .setLabel('อาชีพ')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('gambling')
                    .setLabel('การพนัน')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop')
                    .setLabel('ร้านค้า')
                    .setStyle(ButtonStyle.Secondary)
            );

        const bankNav = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bank')
                    .setLabel('ธนาคาร')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({
            embeds: [pages.main],
            components: [navigation, bankNav],
            fetchReply: true
        });

        // สร้าง collector สำหรับปุ่มกด
        const collector = response.createMessageComponentCollector({
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: '❌ กรุณาใช้คำสั่ง /tutorial ของคุณเอง',
                    ephemeral: true
                });
            }

            // อัพเดท embed ตามปุ่มที่กด
            await i.update({
                embeds: [pages[i.customId]],
                components: [navigation, bankNav]
            });
        });

        collector.on('end', () => {
            navigation.components.forEach(button => button.setDisabled(true));
            bankNav.components.forEach(button => button.setDisabled(true));
            interaction.editReply({
                components: [navigation, bankNav]
            }).catch(() => {});
        });
    }
};