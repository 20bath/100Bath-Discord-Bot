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
        await interaction.deferReply();

        try {
            const canvas = createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            // Clean white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Minimal border design
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

            // Corner accents
            const cornerSize = 20;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 2;

            // Draw corners
            [
                [15, 35, 15, 15, 35, 15], // Top-left
                [canvas.width - 35, 15, canvas.width - 15, 15, canvas.width - 15, 35], // Top-right
                [15, canvas.height - 35, 15, canvas.height - 15, 35, canvas.height - 15], // Bottom-left
                [canvas.width - 35, canvas.height - 15, canvas.width - 15, canvas.height - 15, canvas.width - 15, canvas.height - 35] // Bottom-right
            ].forEach(([x1, y1, x2, y2, x3, y3]) => {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.stroke();
            });

            // Subtle diagonal pattern
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.lineWidth = 1;
            for (let i = -canvas.height; i < canvas.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            // Top accent line with gradient
            const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            accentGradient.addColorStop(0, '#4361ee');
            accentGradient.addColorStop(1, '#3f37c9');
            ctx.fillStyle = accentGradient;
            ctx.fillRect(0, 0, canvas.width, 4);

            // Modern title
            ctx.font = 'bold 32px Sarabun';
            ctx.fillStyle = '#2c2c2c';
            ctx.textAlign = 'center';
            ctx.fillText('🎮 คู่มือการเริ่มต้นเล่นเกม', canvas.width / 2, 50);

            // Content sections with modern design
            const sections = [
                {
                    icon: '🎯',
                    title: 'เริ่มต้นใช้งาน',
                    commands: ['/start', '/profile', '/help'],
                    descriptions: ['สร้างตัวละคร', 'ดูข้อมูลตัวละคร', 'ดูคำสั่งทั้งหมด']
                },
                {
                    icon: '💰',
                    title: 'ระบบเศรษฐกิจ',
                    commands: ['/work', '/bank', '/shop'],
                    descriptions: ['ทำงานหาเงิน', 'จัดการเงินในธนาคาร', 'ร้านค้าไอเทม']
                },
                {
                    icon: '⭐',
                    title: 'กิจกรรมพิเศษ',
                    commands: ['/quest', '/gacha', '/achievement'],
                    descriptions: ['ภารกิจประจำวัน', 'สุ่มไอเทมพิเศษ', 'รางวัลความสำเร็จ']
                }
            ];

            let yPos = 80;
            sections.forEach((section, index) => {
                // Section container with subtle shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(30, yPos, canvas.width - 60, 90);
                ctx.restore();

                // Section icon and title
                ctx.font = '24px Sarabun';
                ctx.fillStyle = '#4361ee';
                ctx.textAlign = 'left';
                ctx.fillText(section.icon, 45, yPos + 35);

                ctx.font = 'bold 22px Sarabun';
                ctx.fillStyle = '#2c2c2c';
                ctx.fillText(section.title, 85, yPos + 35);

                // Commands with descriptions
                section.commands.forEach((cmd, i) => {
                    ctx.font = '18px Sarabun';
                    ctx.fillStyle = '#666666';
                    ctx.fillText(`${cmd}`, 45, yPos + 65 + (i * 25));
                    
                    ctx.fillStyle = '#999999';
                    ctx.fillText(`- ${section.descriptions[i]}`, 150, yPos + 65 + (i * 25));
                });

                yPos += 100;
            });

            // Bottom accent with gradient
            const bottomGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
            bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

            // Footer text
            ctx.font = '18px Sarabun';
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'center';
            ctx.fillText('💡 พิมพ์ /help เพื่อดูคำสั่งทั้งหมด | พิมพ์ /support หากต้องการความช่วยเหลือ', canvas.width / 2, canvas.height - 20);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'tutorial.png' });

            // Interactive buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('getting_started')
                        .setLabel('🎯 เริ่มต้นใช้งาน')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('economy')
                        .setLabel('💰 ระบบเศรษฐกิจ')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('activities')
                        .setLabel('⭐ กิจกรรมพิเศษ')
                        .setStyle(ButtonStyle.Primary)
                );

            const response = await interaction.editReply({
                files: [attachment],
                components: [buttons]
            });

            // Button interactions
            const collector = response.createMessageComponentCollector({ time: 300000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ กรุณาใช้คำสั่ง /tutorial ของคุณเอง', ephemeral: true });
                }

                const guides = {
                    getting_started: {
                        title: '🎯 วิธีการเริ่มต้นใช้งาน',
                        description: [
                            '**1. สร้างตัวละคร**',
                            '• ใช้คำสั่ง `/start` เพื่อสร้างตัวละครของคุณ',
                            '• เลือกอาชีพเริ่มต้นที่เหมาะกับคุณ',
                            '• รับไอเทมและเงินเริ่มต้น\n',
                            '**2. ดูข้อมูลตัวละคร**',
                            '• ใช้ `/profile` เพื่อดูสถานะตัวละคร',
                            '• ตรวจสอบเลเวล, เงิน และไอเทม',
                            '• ดูความคืบหน้าของตัวละคร'
                        ].join('\n')
                    },
                    economy: {
                        title: '💰 ระบบเศรษฐกิจ',
                        description: [
                            '**การทำงานและหาเงิน**',
                            '• ใช้ `/work` เพื่อทำงานและรับเงิน',
                            '• ทำงานต่อเนื่องเพื่อรับโบนัส',
                            '• อัพเกรดอาชีพเพื่อรับเงินมากขึ้น\n',
                            '**การจัดการเงิน**',
                            '• ฝากเงินในธนาคารเพื่อรับดอกเบี้ย',
                            '• ซื้อไอเทมเพื่อเพิ่มความสามารถ',
                            '• ลงทุนในตลาดซื้อขาย'
                        ].join('\n')
                    },
                    activities: {
                        title: '⭐ กิจกรรมพิเศษ',
                        description: [
                            '**ภารกิจประจำวัน**',
                            '• รับเควสใหม่ทุกวัน',
                            '• ทำภารกิจเพื่อรับรางวัล',
                            '• สะสมแต้มแลกรางวัลพิเศษ\n',
                            '**กิจกรรมสุ่มไอเทม**',
                            '• สุ่มไอเทมหายากด้วย `/gacha`',
                            '• สะสมไอเทมครบเซ็ตรับโบนัส',
                            '• แลกเปลี่ยนไอเทมกับผู้เล่นอื่น'
                        ].join('\n')
                    }
                };

                const embed = new EmbedBuilder()
                    .setColor('#4361ee')
                    .setTitle(guides[i.customId].title)
                    .setDescription(guides[i.customId].description);

                await i.reply({ embeds: [embed], ephemeral: true });
            });

        } catch (error) {
            console.error('Error in tutorial command:', error);
            await interaction.editReply('❌ เกิดข้อผิดพลาดในการแสดงคู่มือ');
        }
    }
};