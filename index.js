require("dotenv").config();
const { Client, GatewayIntentBits, Collection, PermissionFlagsBits, AttachmentBuilder  } = require("discord.js");
const fs = require('fs');
const path = require('path');
const adminCommand = require("./src/commands/prefix/admin");
const joinLeave = require("./src/events/joinLeave");
const levelSystem = require("./src/utils/levelSystem");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});


//prefixs
adminCommand(client);

//events
joinLeave(client);
levelSystem(client);


client.commands = new Collection();

  // ลงทะเบียนคำสั่งใหม่ทั้งหมด
  client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
  
    // Register all slash commands
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, 'src', 'commands')).filter(file => file.endsWith('.js'));
  
    for (const file of commandFiles) {
      const command = require(path.join(__dirname, 'src', 'commands', file));
      // Store command in collection
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  
    try {
      await client.application.commands.set(commands);
      console.log('✅ Registered commands:', commands.map(cmd => cmd.name).join(', '));
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
    

  //ตรวจ channel ส่ง่ข้อความ
  try {
    join_channel = client.channels.cache.get(process.env.JOIN_CHANNEL_ID);
    leave_channel = client.channels.cache.get(process.env.LEAVE_CHANNEL_ID);
    level_up_channel = client.channels.cache.get(process.env.LEVEL_UP_CHANNEL_ID);
    console.log("Join channel: " + join_channel.name);
    console.log("Leave channel: " + leave_channel.name);
    console.log("Level up channel: " + level_up_channel.name);
  } catch (error) {
    console.error(error);
  }


  // แสดงจำนวนและชื่อเซิร์ฟที่ bot อยู่
  const guildCount = client.guilds.cache.size;
  const guildNames = client.guilds.cache.map(guild => guild.name).join(', ');
  console.log(`🤖 Bot is in ${guildCount} servers: ${guildNames}`);


})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ 
      content: '❌ เกิดข้อผิดพลาดในการใช้คำสั่ง!',
      ephemeral: true 
    });
  }
});

client.login(process.env.DISCORD_TOKEN)
