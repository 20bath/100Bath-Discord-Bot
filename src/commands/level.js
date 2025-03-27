const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const levelSystem = require('../utils/levelSystem');
const { db } = require('../config/firebase');
const path = require('path');

const { createCanvas, loadImage, registerFont } = require('canvas');

// Register Thai font
registerFont(path.join(__dirname, '../fonts/Sarabun-Regular.ttf'), { family: 'Sarabun' });
registerFont(path.join(__dirname, '../fonts/Sarabun-Bold.ttf'), { family: 'Sarabun-Bold' });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('ดูข้อมูลเลเวลของคุณหรือผู้อื่น')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('ผู้ใช้ที่ต้องการดูข้อมูล')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const target = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(target.id);
            
            const userRef = db.collection('users').doc(target.id);
            const doc = await userRef.get();

            if (!doc.exists) {
                return interaction.editReply(`❌ ไม่พบข้อมูลของ ${target}`);
            }

            const data = doc.data();
            const currentXP = data.xp || 0;
            const currentLevel = data.level || 1;
            const nextLevelXP = levelSystem.getRequiredXP(currentLevel + 1);
            const currentLevelXP = levelSystem.getRequiredXP(currentLevel);
            const xpNeeded = nextLevelXP - currentXP;
            const progress = Math.max(0, Math.min(100, Math.floor((currentXP / currentLevelXP) * 100)));

            // Create canvas
            const canvas = createCanvas(800, 250);
            const ctx = canvas.getContext('2d');

            // Clean white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Minimal border design
            // Outer border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

            // Corner accents
            const cornerSize = 20;
            const cornerThickness = 2;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = cornerThickness;

            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(15, 35);
            ctx.lineTo(15, 15);
            ctx.lineTo(35, 15);
            ctx.stroke();

            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(canvas.width - 35, 15);
            ctx.lineTo(canvas.width - 15, 15);
            ctx.lineTo(canvas.width - 15, 35);
            ctx.stroke();

            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(15, canvas.height - 35);
            ctx.lineTo(15, canvas.height - 15);
            ctx.lineTo(35, canvas.height - 15);
            ctx.stroke();

            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(canvas.width - 35, canvas.height - 15);
            ctx.lineTo(canvas.width - 15, canvas.height - 15);
            ctx.lineTo(canvas.width - 15, canvas.height - 35);
            ctx.stroke();

            // Subtle diagonal pattern (adjusted position for border)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.lineWidth = 1;
            for (let i = -canvas.height; i < canvas.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            // Minimal top accent line
            const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            accentGradient.addColorStop(0, '#e6e6e6');
            accentGradient.addColorStop(1, '#f5f5f5');
            ctx.fillStyle = accentGradient;
            ctx.fillRect(0, 0, canvas.width, 4);

            // Load and draw avatar with clean border
            const avatar = await loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
            
            // Modern circular avatar
            ctx.save();
            // Add subtle shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            // Create circle clip
            ctx.beginPath();
            ctx.arc(125, 120, 70, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 55, 50, 140, 140);
            ctx.restore();

            // Clean avatar border
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(125, 120, 70, 0, Math.PI * 2);
            ctx.stroke();

            // Username with modern typography
            ctx.font = 'bold 32px "Sarabun"';
            ctx.fillStyle = '#2c2c2c';
            ctx.fillText(target.username, 250, 80);

            // Level info with icon
            ctx.font = '24px "Sarabun"';
            ctx.fillStyle = '#666666';
            ctx.fillText(`💫 Level ${currentLevel}`, 250, 120);

            // Minimal XP Bar
            const barWidth = 450;
            const barHeight = 12;  // Thinner bar
            const barX = 250;
            const barY = 136;

            // XP Bar background
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 4);
            ctx.fill();

            // XP Bar progress
            const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            progressGradient.addColorStop(0, '#389b13');
            progressGradient.addColorStop(1, '#48c918');
            ctx.fillStyle = progressGradient;
            ctx.beginPath();
            ctx.roundRect(barX, barY, (progress / 100) * barWidth, barHeight, 4);
            ctx.fill();

            // XP Information
            ctx.font = '20px "Sarabun"';
            ctx.fillStyle = '#999999';
            ctx.fillText(
                `${currentXP} / ${currentLevelXP} XP (${progress}%)`, 
                barX, barY + 40
            );

            // Additional XP info
            ctx.font = '18px "Sarabun"';
            ctx.fillStyle = '#b3b3b3';
            ctx.fillText(
                `อีก ${xpNeeded} XP เพื่อขึ้น Level ${currentLevel + 1}`,
                barX, barY + 65
            );

            // Bottom accent
            const bottomGradient = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
            bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

            // Create attachment and send
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'level-card.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in level command:', error);
            await interaction.editReply('❌ เกิดข้อผิดพลาดในการสร้างการ์ดเลเวล');
        }
    },
};