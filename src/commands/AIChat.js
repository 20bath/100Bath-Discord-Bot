const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
    name: 'ask',
    description: 'ถามคำถามกับ AI',
    options: [
        {
            name: 'question',
            description: 'คำถามที่ต้องการถาม',
            type: 3,
            required: true
        }
    ],
    async execute(interaction) {
        // ลบ deferReply ที่นี่เพราะมีการ defer ใน index.js แล้ว
        try {
            const question = interaction.options.getString('question');
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.0-flash", // เปลี่ยนเป็น gemini-pro เพื่อความเสถียร
            });
            
            const prompt = `คำถาม: ${question}\nกรุณาตอบแบบสั้นๆ กระชับ ไม่เกิน 2-3 ประโยค`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            const embed = new EmbedBuilder()
                .setColor('#f1efe7')
                .setAuthor({ 
                    name: interaction.user.username, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .addFields(
                    { name: ' ❓ คำถาม : ', value: question },
                    { name: ' ⚪️ 100BATH AI : ', value: response.text().slice(0, 1000) }
                )
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error in AI chat:", error);
            return await interaction.editReply({
                content: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
                ephemeral: true
            });
        }
    }
};