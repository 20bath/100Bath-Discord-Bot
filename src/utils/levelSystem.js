const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require('canvas');
const { db } = require("../config/firebase");

const voiceSessions = new Map(); // key: userId, value: { joinTime, channelId }

// Cooldown settings (milliseconds)
const COOLDOWNS = {
  MESSAGE: 10000// 10 seconds
};

// XP ranges
const XP_RANGES = {
  MESSAGE: { MIN: 5, MAX: 10 },
  VOICE: {
    PER_MINUTE: 2, // XP per minute in voice
    MIN_TIME: 60000, // Minimum time (1 minute) to get XP
  },
};

// Cooldown maps
const messageCooldowns = new Map();
const voiceCooldowns = new Map();






// Helper function to get random XP
function getRandomXP(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to calculate required XP for next level
function getRequiredXP(level) {
  return Math.floor(150 * Math.pow(1.4, level - 1));
}

// Add this new function
async function getLevel(userId) {
  try {
      const userRef = db.collection("users").doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
          return 1; // Default level for new users
      }

      return doc.data().level || 1;
  } catch (error) {
      console.error("Error getting user level:", error);
      return 1; // Return default level on error
  }
}

// Helper function to check and update cooldown
function checkCooldown(userId, type) {
  const cooldownMap = type === "MESSAGE" ? messageCooldowns : voiceCooldowns;
  const cooldownTime = COOLDOWNS[type];
  const now = Date.now();

  if (cooldownMap.has(userId)) {
    const lastTime = cooldownMap.get(userId);
    if (now - lastTime < cooldownTime) return false;
  }

  cooldownMap.set(userId, now);
  return true;
}





async function addXP(member, xpToAdd) {
  const userRef = db.collection("users").doc(member.id);
  const doc = await userRef.get();
  let oldLevel = 1;

  try {
    if (!doc.exists) {
      await userRef.set({
        guildId: member.guild.id,
        xp: xpToAdd,
        level: 1,
        lastUpdated: Date.now(),
      });
      return { xp: xpToAdd, level: 1, leveledUp: false };
    }

    const data = doc.data();
    const newXP = (data.xp || 0) + xpToAdd;
    oldLevel = data.level || 1;
    let newLevel = oldLevel;

    // Calculate new level
    while (newXP >= getRequiredXP(newLevel)) {
      newLevel++;
    }

    await userRef.update({
      xp: newXP,
      level: newLevel,
      lastUpdated: Date.now(),
    });

    // Handle level up
    if (newLevel > oldLevel) {
      await handleLevelUp(member, newLevel);
    }

    return {
      xp: newXP,
      level: newLevel,
      leveledUp: newLevel > oldLevel,
    };
  } catch (error) {
    console.error("Error in addXP:", error);
    throw error;
  }
}







// Function to generate pastel color
function generatePastelColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 65; // Pastel saturation
  const lightness = 80; // Pastel lightness
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Function to convert HSL to Hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}







async function handleLevelUp(member, newLevel) {
  try {
    if (!level_up_channel) return;

    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Create minimal gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#fafafa');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create role and get color
    const roleName = `💫 Level ${newLevel}`;
    const pastelColor = generatePastelColor();
    const hexColor = hslToHex(...pastelColor.match(/\d+/g).map(Number));

    // Add subtle grid pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.strokeRect(x, y, gridSize, gridSize);
      }
    }
    ctx.restore();

    // Add minimal celebration shapes
    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 3; i++) {
      // Large minimal circles
      ctx.beginPath();
      ctx.arc(
        canvas.width * Math.random(),
        canvas.height * Math.random(),
        100 + Math.random() * 100,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = hexColor;
      ctx.fill();
    }
    ctx.restore();

    // Add thin accent line at top
    ctx.fillStyle = hexColor + '30';
    ctx.fillRect(0, 0, canvas.width, 2);

    // Avatar circle glow
    ctx.save();
    const glowGradient = ctx.createRadialGradient(125, 150, 60, 125, 150, 90);
    glowGradient.addColorStop(0, hexColor + '20');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(125, 130, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw avatar
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, 140, 70, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 55, 70, 140, 140);
    ctx.restore();

    // Clean avatar border
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(125, 140, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Add modern typography
    ctx.textAlign = 'left';
    
    // "LEVEL UP" text with style
    ctx.font = 'bold 48px "Sarabun"';
    ctx.fillStyle = '#2c2c2c';
    ctx.fillText('LEVEL UP!', 250, 110);

    // Username with new level
    ctx.font = '24px "Sarabun"';
    ctx.fillStyle = '#666666';
    ctx.fillText(member.user.username, 250, 140);

    // Level number with emphasis
    ctx.font = 'bold 36px "Sarabun"';
    ctx.fillStyle = hexColor;
    ctx.fillText(`Level ${newLevel}`, 250, 183);

    // Minimal progress indicator
    const barWidth = 400;
    const barHeight = 4; // Ultra thin bar
    const barX = 250;
    const barY = 200;

    // Progress bar with clean design
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    barGradient.addColorStop(0, hexColor);
    barGradient.addColorStop(1, hexColor + '80');
    ctx.fillStyle = barGradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Next level info with subtle style
    ctx.font = '18px "Sarabun"';
    ctx.fillStyle = '#999999';
    ctx.fillText(
      `เป้าหมายถัดไป ${getRequiredXP(newLevel)} XP`,
      barX, barY + 30
    );


    // Handle role creation and assignment
    try {
      let role = member.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        role = await member.guild.roles.create({
          name: roleName,
          color: hexColor,
          reason: `Auto role for level ${newLevel}`
        });
      }

      // Update roles
      const oldLevelRoles = member.roles.cache.filter(role => 
        role.name.startsWith('💫 Level ')
      );
      if (oldLevelRoles.size > 0) {
        await member.roles.remove(oldLevelRoles);
      }
      await member.roles.add(role);

      // Send level up notification
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'levelup.png' });
      await level_up_channel.send({
        content: `✨ ยินดีด้วย ${member}! คุณได้อัพเลเวล!`,
        files: [attachment]
      });
    } catch (error) {
      console.error('Role management error:', error);
    }

  } catch (error) {
    console.error('Error in handleLevelUp:', error);
  }
}












module.exports = (client) => {

  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    if (!checkCooldown(message.author.id, "MESSAGE")) return;

    try {
      const xp = getRandomXP(XP_RANGES.MESSAGE.MIN, XP_RANGES.MESSAGE.MAX);
      await addXP(message.member, xp);
    } catch (error) {
      console.error("Error in messageCreate XP handling:", error);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return; // ตรวจว่าเป็น Slash Command
    if (!interaction.inGuild()) return; // ต้องอยู่ใน server เท่านั้น

    const userId = interaction.user.id;

    if (!checkCooldown(userId, "MESSAGE")) return;

    try {
      const xp = getRandomXP(XP_RANGES.MESSAGE.MIN, XP_RANGES.MESSAGE.MAX);
      const member = await interaction.guild.members.fetch(userId);
      await addXP(member, xp);
    } catch (error) {
      console.error("Error in interactionCreate XP handling:", error);
    }
  });

  client.on("voiceStateUpdate", async (oldState, newState) => {

    // Skip if it's a bot
    if (newState.member.user.bot) return;

    const member = newState.member;

    // User joins a voice channel
    if (!oldState.channelId && newState.channelId) {
        voiceSessions.set(member.id, {
            joinTime: Date.now(),
            channelId: newState.channelId,
        });
        console.log(`📥 ${member.user.tag} เริ่มจับเวลาใน voice channel`);
    }

    // User leaves a voice channel
    if (oldState.channelId && !newState.channelId) {
        const session = voiceSessions.get(member.id);
        if (!session) {
            console.log(`❌ ไม่พบข้อมูล session ของ ${member.user.tag}`);
            return;
        }

        const timeSpent = Date.now() - session.joinTime;
        voiceSessions.delete(member.id);

        // ตรวจสอบเวลาขั้นต่ำ (1 นาที)
        if (timeSpent < XP_RANGES.VOICE.MIN_TIME) {
            console.log(`❌ ${member.user.tag} อยู่ในห้องน้อยเกินไป (${Math.floor(timeSpent/1000)} วินาที)`);
            return;
        }

        try {
            // คำนวณ XP (2 XP ต่อนาที)
            const minutesSpent = Math.floor(timeSpent / 60000);
            const xpEarned = minutesSpent * XP_RANGES.VOICE.PER_MINUTE;

            // ดึงข้อมูลปัจจุบันจาก database
            const userRef = db.collection("users").doc(member.id);
            const doc = await userRef.get();

            if (!doc.exists) {
                // ถ้ายังไม่มีข้อมูล ให้สร้างใหม่
                await userRef.set({
                    guildId: member.guild.id,
                    xp: xpEarned,
                    level: 1,
                    lastUpdated: Date.now(),
                });
                console.log(`✅ สร้างข้อมูลใหม่และเพิ่ม ${xpEarned} XP ให้ ${member.user.tag}`);
            } else {
                // ถ้ามีข้อมูลอยู่แล้ว ให้อัพเดต
                const currentData = doc.data();
                const newXP = (currentData.xp || 0) + xpEarned;
                let newLevel = currentData.level || 1;

                // เช็คเลเวลอัพ
                while (newXP >= getRequiredXP(newLevel)) {
                    newLevel++;
                }

                await userRef.update({
                    xp: newXP,
                    level: newLevel,
                    lastUpdated: Date.now(),
                });

                console.log(`✅ ${member.user.tag} ได้รับ ${xpEarned} XP จากการอยู่ในห้อง ${minutesSpent} นาที`);
                
                // ถ้าเลเวลอัพ
                if (newLevel > currentData.level) {
                    await handleLevelUp(member, newLevel);
                }
            }
        } catch (error) {
            console.error("❌ Error in voiceStateUpdate XP handling:", error);
        }
    }

    // Handle channel switching
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const session = voiceSessions.get(member.id);
        if (session) {
            session.channelId = newState.channelId;
            voiceSessions.set(member.id, session);
            console.log(`🔄 ${member.user.tag} เปลี่ยนห้อง voice`);
        }
    }
});

  client.once("ready", () => {
    voiceSessions.clear();
    console.log("🧹 Cleared voice sessions");
  });
};

// module.exports = {
//   addXP,
//   getRequiredXP,
//   getRandomXP,
// }
module.exports.getRequiredXP = getRequiredXP;
module.exports.getRandomXP = getRandomXP;
module.exports.addXP = addXP;
module.exports.getLevel = getLevel; // Add this line