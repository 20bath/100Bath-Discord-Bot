const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Register Thai font
registerFont(path.join(__dirname, '../fonts/Sarabun-Regular.ttf'), { family: 'Sarabun' });
registerFont(path.join(__dirname, '../fonts/Sarabun-Bold.ttf'), { family: 'Sarabun-Bold' });

const welcomeMessages = [
  (user) => `🎉 ยินดีต้อนรับ ${user} สู่ 100BATH Community!`,
  (user) => `✨ สวัสดี ${user} ยินดีต้อนรับสู่ครอบครัวของเรา`,
  (user) => `🌟 ${user} เข้ามาร่วมสนุกกับพวกเราแล้ว!`,
  (user) => `👋 โย่ว ${user} ยินดีต้อนรับ!`,
  (user) => `💫 มาแล้วๆ ${user} เข้ามาร่วมแก๊งค์กับเรา`,
  (user) => `🎮 ${user} พร้อมลุยกับพวกเราหรือยัง?`,
  (user) => `🌈 ${user} ยินดีต้อนรับสู่เซิร์ฟที่ดีที่สุด!`,
  (user) => `🎪 ${user} เข้ามาสนุกด้วยกันนน`,
  (user) => `🔥 ${user} มาแรงแซงทุกคน!`,
  (user) => `🌺 อบอุ่นจัง ${user} มาแล้ว!`
];

const goodbyeMessages = [
  (user) => `👋 ลาก่อน ${user} ขอให้โชคดี!`,
  (user) => `💫 ${user} ขอบคุณที่อยู่ด้วยกันมา`,
  (user) => `🌙 ${user} พบกันใหม่ในวันข้างหน้า`,
  (user) => `🌟 ลาก่อน ${user} เราจะคิดถึงนะ`,
  (user) => `🍃 ${user} เดินทางปลอดภัยนะ`,
  (user) => `💕 ${user} ขอบคุณสำหรับช่วงเวลาดีๆ`,
  (user) => `🌈 ${user} หวังว่าจะได้เจอกันอีก`,
  (user) => `🎭 ${user} ลาก่อน แล้วพบกันใหม่`,
  (user) => `🌸 ${user} ขอให้พบเจอแต่สิ่งดีๆ`,
  (user) => `✨ ${user} ขอบคุณที่เป็นส่วนหนึ่งกับเรา`
];

module.exports = (client) => {
  async function createMemberCard(member, type) {
    const canvas = createCanvas(850, 300);
    const ctx = canvas.getContext('2d');

    // Theme colors
    const theme = type === 'join' ? {
      primary: '#E8F5E9',      // Light mint green
      secondary: '#81C784',    // Mint green
      accent: '#43A047',       // Dark green
      text: '#2E7D32',         // Forest green
      pattern: '#A5D6A7'       // Soft green
    } : {
      primary: '#FCE4EC',      // Light pink
      secondary: '#F06292',    // Pink
      accent: '#D81B60',       // Dark pink
      text: '#AD1457',         // Deep pink
      pattern: '#F48FB1'       // Soft pink
    };

    // Background
    ctx.fillStyle = theme.primary;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative pattern
    ctx.strokeStyle = `${theme.pattern}20`; // 20 = 12% opacity
    ctx.lineWidth = 1;
    for (let i = -canvas.height; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }

    // Modern frame
    const frameMargin = 15;
    ctx.strokeStyle = theme.secondary + '40'; // 40 = 25% opacity
    ctx.lineWidth = 2;
    ctx.strokeRect(frameMargin, frameMargin, 
      canvas.width - frameMargin * 2, 
      canvas.height - frameMargin * 2
    );

    // Accent corners
    const cornerSize = 25;
    [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]]
      .forEach(([x, y]) => {
        ctx.fillStyle = theme.accent + '30'; // 30 = 19% opacity
        ctx.beginPath();
        ctx.arc(x, y, cornerSize, 0, Math.PI * 2);
        ctx.fill();
    });

    // Avatar with themed border
    const avatar = await loadImage(member.user.displayAvatarURL({ 
      extension: 'png', 
      size: 256 
    }));
    
    // Avatar shadow and clip
    ctx.save();
    ctx.shadowColor = theme.secondary + '40';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(125, 135, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 55, 65, 140, 140);
    ctx.restore();

    // Avatar border
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(125, 135, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Welcome/Goodbye message with random selection
    ctx.font = 'bold 30px "Sarabun"';
    ctx.fillStyle = theme.text;
    const messages = type === 'join' ? welcomeMessages : goodbyeMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const mainText = randomMessage(`${member.user.tag}`);
    ctx.fillText(mainText, 250, 100);

    // Username
    ctx.font = '24px "Sarabun-Bold"';
    ctx.fillStyle = theme.accent;
    ctx.fillText(member.user.tag, 250, 140);

    // Member info with themed icons
    ctx.font = '20px "Sarabun"';
    ctx.fillStyle = theme.text + 'CC'; // CC = 80% opacity
    const memberIcon = type === 'join' ? '👤' : '📅';
    ctx.fillText(`${memberIcon} สมาชิกลำดับที่ #${member.guild.memberCount}`, 250, 180);
    
    const timeText = type === 'join' ? 
      `⏱️ เข้าร่วมเมื่อ ${new Date().toLocaleString('th-TH')}` :
      `💫 อยู่ด้วยกันมา ${Math.floor((Date.now() - member.joinedTimestamp) / 86400000)} วัน`;
    ctx.fillText(timeText, 250, 210);

    // Server info
    ctx.font = '18px "Sarabun"';
    ctx.fillStyle = theme.secondary;
    ctx.fillText('100BATH Community', 250, 240);

    // Bottom accent line
    const gradient = ctx.createLinearGradient(0, canvas.height - 3, canvas.width, canvas.height - 3);
    gradient.addColorStop(0, theme.secondary + '00');
    gradient.addColorStop(0.5, theme.secondary + '40');
    gradient.addColorStop(1, theme.secondary + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 3, canvas.width, 3);

    return new AttachmentBuilder(canvas.toBuffer(), { name: `${type}-card.png` });
  }

  client.on("guildMemberAdd", async (member) => {
    try {
      await member.roles.add(process.env.DEFAULT_ROLE_ID);
      await member.roles.add(process.env.DEFAULT_LEVEL_ID);
      console.log(`✅ กำหนดยศให้ ${member.user.tag} เรียบร้อยแล้ว`);

      if (join_channel) {
        const card = await createMemberCard(member, 'join');
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        await join_channel.send({ 
          content: randomMessage(`<@${member.id}>`),
          files: [card] 
        });
      }
    } catch (error) {
      console.error('Error in guildMemberAdd:', error);
    }
  });

  client.on("guildMemberRemove", async (member) => {
    try {
      if (leave_channel) {
        const card = await createMemberCard(member, 'leave');
        const randomMessage = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
        await leave_channel.send({ 
          content: randomMessage(`<@${member.id}>`),
          files: [card] 
        });
      }
    } catch (error) {
      console.error('Error in guildMemberRemove:', error);
    }
  });
};