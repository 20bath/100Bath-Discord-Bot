require("dotenv").config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials,
    REST, 
    Routes, 
    ApplicationCommandType, 
    EmbedBuilder 
} = require("discord.js");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const { db } = require('./src/config/firebase');
const EconomySystem = require('./src/utils/economySystem'); // เพิ่มบรรทัดนี้

// สร้าง Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

// โหลด event handlers
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// โหลด commands
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

// ฟังก์ชันสำหรับโหลดคำสั่งจากโฟลเดอร์
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // ถ้าเป็นโฟลเดอร์ให้โหลดคำสั่งในโฟลเดอร์นั้นด้วย
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.name && command.description) {
                commands.push(command);
                console.log(`โหลดคำสั่ง: ${command.name}`);
            }
        }
    }
}

// เริ่มโหลดคำสั่ง
loadCommands(commandsPath);

// ลงทะเบียน commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// เพิ่มฟังก์ชันตรวจสอบการเชื่อมต่อ Firebase
async function checkFirebaseConnection() {
    try {
        const testDoc = await db.collection('test').doc('connection').set({
            timestamp: new Date(),
            status: 'connected'
        });
        console.log('✅ เชื่อมต่อ Firebase สำเร็จ!');
        return true;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ Firebase:', error);
        return false;
    }
}

// เพิ่มฟังก์ชันสำหรับสุ่ม status
function getRandomStatus() {
    const statuses = [
        { type: 'PLAYING', message: '/help เพื่อดูคำสั่งทั้งหมด' },
        { type: 'WATCHING', message: '{memberCount} สมาชิก' },
        { type: 'LISTENING', message: 'คำสั่ง /ask' },
        { type: 'PLAYING', message: 'พิมพ์ข้อความเพื่อรับ EXP' },
        { type: 'WATCHING', message: 'เลเวลของทุกคน' },
        { type: 'COMPETING', message: 'แข่งขันเก็บเลเวล' }
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// เพิ่มฟังก์ชัน serialize สำหรับ BigInt
function customSerializer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

// Add after REST initialization and before client.once('ready')
async function registerCommands() {
    try {
        console.log('เริ่มลงทะเบียน slash commands...');
        
        // Transform commands to Discord API format
        const commandData = commands.map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options || [],
            type: ApplicationCommandType.ChatInput
        }));

        // Register commands using REST
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { 
                body: commandData 
            }
        );

        console.log(`✅ ลงทะเบียน ${data.length} คำสั่งสำเร็จ!`);
        return true;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
        return false;
    }
}

// เพิ่มหลัง client.once('ready')
async function sendWeeklyLeaderboard(client) {
    try {
        const channel = client.channels.cache.get(process.env.ECONOMY_CHANNEL_ID);
        if (!channel) return;

        // ดึงข้อมูล top 10 ผู้เล่น
        const topPlayers = await EconomySystem.getLeaderboard(channel.guild.id, 10);
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 อันดับเศรษฐีประจำสัปดาห์')
            .setDescription(
                topPlayers.map((player, index) => {
                    const medal = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💠';
                    return `${medal} **อันดับ ${index + 1}** <@${player.userId}>\n` +
                           `┣ 💰 เหรียญ: ${player.coins.toLocaleString()}\n` +
                           `┣ 💎 เพชร: ${player.gems.toLocaleString()}\n` +
                           `┗ 💵 รายได้สุทธิ: ${(player.stats.totalEarned - player.stats.totalSpent).toLocaleString()}`;
                }).join('\n\n')
            )
            .setFooter({ text: '🕒 อัพเดททุกวันอาทิตย์' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending weekly leaderboard:', error);
    }
}

// ตั้งเวลาส่ง Leaderboard ทุกวันอาทิตย์เวลา 00:00
function scheduleWeeklyLeaderboard(client) {
    setInterval(async () => {
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
            await sendWeeklyLeaderboard(client);
        }
    }, 60000); // เช็คทุกนาที
}

// ลบโค้ดที่ซ้ำซ้อนใน client.once('ready')
client.once('ready', async () => {
    try {
        const isConnected = await checkFirebaseConnection();
        
        // เริ่มระบบ status แบบสุ่มและระบบเศรษฐกิจ
        setInterval(() => {
            const { type, message } = getRandomStatus();
            const formattedMessage = message.replace('{memberCount}', 
                client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
            );
            
            client.user.setActivity(formattedMessage, { 
                type: type === 'PLAYING' ? 0 :
                      type === 'WATCHING' ? 3 :
                      type === 'LISTENING' ? 2 :
                      type === 'COMPETING' ? 5 : 0
            });
        }, 10000);

        // เริ่มระบบเงินเฟ้อ
        await EconomySystem.checkAndApplyInflation(client);
        
        // ลงทะเบียน commands
        await registerCommands();
        
        // เริ่มระบบแจ้งเตือน Leaderboard
        scheduleWeeklyLeaderboard(client);
        
        console.log(`🤖 บอท ${client.user.tag} พร้อมใช้งาน!`);
    } catch (error) {
        console.error('Error in ready event:', error);
    }
});

// เพิ่มการตรวจสอบก่อนใช้งาน Firebase ในคำสั่งต่างๆ
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = commands.find(cmd => cmd.name === interaction.commandName);
    if (!command) return;

    try {
        // Defer reply ทันทีเพื่อป้องกัน timeout
        await interaction.deferReply().catch(console.error);

        // ตรวจสอบการเชื่อมต่อ Firebase
        if (command.requiresDatabase) {
            const isConnected = await checkFirebaseConnection();
            if (!isConnected) {
                return await interaction.editReply({
                    content: '❌ ขออภัย ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ในขณะนี้',
                    ephemeral: true
                }).catch(console.error);
            }
        }

        // ดำเนินการคำสั่ง
        await command.execute(interaction).catch(async (error) => {
            console.error('Command execution error:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ เกิดข้อผิดพลาดในการทำงานคำสั่งนี้',
                    ephemeral: true
                }).catch(console.error);
            }
        });

    } catch (error) {
        console.error('Interaction error:', error);
        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ เกิดข้อผิดพลาดในการทำงานคำสั่งนี้',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ เกิดข้อผิดพลาดในการทำงานคำสั่งนี้',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Error handling error:', replyError);
        }
    }
});

// ดักจับ unhandled errors
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);