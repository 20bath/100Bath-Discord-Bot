const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('คุยกับ AI 100Bath')
        .addStringOption(option =>
            option
                .setName('prompt')
                .setDescription('ข้อความที่ต้องการถาม')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction) {
        try {
            // Defer reply since AI might take time to respond
            await interaction.deferReply();

            const prompt = interaction.options.getString('prompt');
            
            // Initialize the model
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            // Generate response from AI
            const result = await model.generateContent(prompt + "ขอสั้นๆ หน่อยนะครับ", { max_tokens: 1000 });
            const response = await result.response;
            const text = response.text();

            // Create embed for response
            const embed = new EmbedBuilder()
                .setColor('#93e9fe')
                .setTitle(' 100Bath AI')
                .addFields(
                    {
                        name: '❓ คำถาม',
                        value: prompt,
                        inline: false
                    },
                    {
                        name: '💭 คำตอบ',
                        value: text.length > 1024 ? `${text.substring(0, 1021)}...` : text,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Powered by Google Gemini AI' 
                })
                .setTimestamp();

            // Handle long responses
            if (text.length > 1024) {
                const chunks = text.match(/.{1,1900}/g);
                
                // Send initial embed
                await interaction.editReply({ embeds: [embed] });

                // Send remaining text as follow-up messages
                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp({
                        content: chunks[i],
                        ephemeral: false
                    });
                }
            } else {
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('AI Command Error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ เกิดข้อผิดพลาด')
                .setDescription('ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาลองใหม่อีกครั้ง')
                .setTimestamp();

            // If the interaction hasn't been deferred yet
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        }
    },
};