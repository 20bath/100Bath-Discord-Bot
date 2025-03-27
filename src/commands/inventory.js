const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const economy = require('../utils/economySystem');
const shop = require('../utils/shopSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('แสดงไอเทมในกระเป๋าของคุณ')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('ประเภทของไอเทมที่ต้องการดู')
                .addChoices(
                    { name: '🛡️ อุปกรณ์ถาวร', value: 'permanent' },
                    { name: '⏳ ไอเทมชั่วคราว', value: 'temporary' },
                    { name: '👑 ยศพิเศษ', value: 'roles' },
                    { name: '💼 ไอเทมจากการทำงาน', value: 'work_items' },
                    { name: '📦 ทั้งหมด', value: 'all' }
                )
                .setRequired(false)),

    async execute(interaction) {
        try{
        await interaction.deferReply();

        const userId = interaction.user.id;
        const category = interaction.options.getString('category') || 'all';
        const profile = await economy.getProfile(userId);

        if (!profile || !profile.inventory || profile.inventory.length === 0) {
            return interaction.editReply('❌ คุณยังไม่มีไอเทมในกระเป๋า');
        }

        // Clean up expired items first
        await shop.cleanupExpiredItems(userId);

        const embed = new EmbedBuilder()
            .setTitle('🎒 กระเป๋าของ ' + interaction.user.username)
            .setColor('#FFB74D');

        function formatItem(item) {
            const shopItem = shop.findItem(item.id);
            if (shopItem) {
                let status = item.active ? '✅ กำลังใช้งาน' : '❌ ไม่ได้ใช้งาน';
                if (item.expiresAt) {
                    const timeLeft = item.expiresAt - Date.now();
                    if (timeLeft > 0) {
                        const hours = Math.floor(timeLeft / 3600000);
                        const minutes = Math.floor((timeLeft % 3600000) / 60000);
                        status += `\n⏳ หมดอายุใน ${hours}h ${minutes}m`;
                    }
                }
                return `${shopItem.name}\n${status}`;
            } else if (item.type === 'work_item') {
                return `${item.name}\n💰 มูลค่า: ${item.value} บาท`;
            }
            return `${item.name}`;
        }

        let items = profile.inventory;
        if (category !== 'all') {
            if (category === 'work_items') {
                items = items.filter(item => item.type === 'work_items');
            } else {
                items = items.filter(item => {
                    const shopItem = shop.findItem(item.id);
                    return shopItem && shopItem.type === category;
                });
            }
        }

        // Group items by category
        const categories = {
            permanent: [],
            temporary: [],
            roles: [],
            work_items: []
        }

        items.forEach(item => {
            try {
                const shopItem = shop.findItem(item.id);
                if (shopItem && shopItem.type && categories[shopItem.type]) {
                    categories[shopItem.type].push(formatItem(item));
                } else if (item.type === 'work_item') {
                    categories.work_items.push(formatItem(item));
                }
            } catch (err) {
                console.error(`Error processing item ${item.id}:`, err);
            }
        });

        Object.entries(categories).forEach(([key, items]) => {
            if (items.length > 0) {
                embed.addFields({ 
                    name: categoryDisplayNames[key], 
                    value: items.join('\n\n') || 'ไม่มีไอเทม'
                });
            }
        });

        if (!embed.data.fields?.length) {
            embed.setDescription('❌ ไม่พบไอเทมในหมวดหมู่ที่เลือก');
        }

        return interaction.editReply({ embeds: [embed] })
    } catch (error) {
        console.error('Error in inventory command:', error);
        
        // Check if interaction was already replied to
        if (interaction.replied || interaction.deferred) {
            return interaction.editReply('❌ เกิดข้อผิดพลาดในการแสดงไอเทม');
        } else {
            return interaction.reply('❌ เกิดข้อผิดพลาดในการแสดงไอเทม');
        }
    }   
    }
}