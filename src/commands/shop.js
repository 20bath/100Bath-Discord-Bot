const { EmbedBuilder } = require('discord.js');
const ShopSystem = require('../utils/shopSystem');
const EconomySystem = require('../utils/economySystem');

module.exports = {
    name: 'shop',
    description: 'ร้านค้าระบบเศรษฐกิจ',
    options: [
        {
            name: 'view',
            description: 'ดูร้านค้า',
            type: 1
        },
        {
            name: 'buy',
            description: 'ซื้อไอเทม',
            type: 1,
            options: [
                {
                    name: 'item',
                    description: 'เลือกไอเทมที่จะซื้อ',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '👑 Noble', value: 'rank_noble' },
                        { name: '⚔️ Royal Knight', value: 'rank_knight' },
                        { name: '👑 Grand Duke', value: 'rank_duke' },
                        { name: '🏰 Emperor', value: 'rank_emperor' },
                        { name: '🍀 Lucky Charm', value: 'lucky_charm' },
                        { name: '⭐ EXP Elixir', value: 'exp_elixir' },
                        { name: '💰 Fortune Potion', value: 'fortune_potion' }
                    ]
                }
            ]
        }
    ],
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'view') {
                const shopData = ShopSystem.getShopItems();
                const userData = await EconomySystem.getUserData(interaction.user.id, interaction.guild.id);

                const embed = new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('🏰 Royal Market')
                    .setDescription(
                        `💰 เงินของคุณ: ${userData.coins.toLocaleString()} เหรียญ\n` +
                        `💎 เพชร: ${userData.gems.toLocaleString()} เพชร`
                    )
                    .addFields(
                        {
                            name: '👑 ยศพิเศษ',
                            value: shopData.roles.map(role => 
                                `${role.name}\n` +
                                `┣ 💰 ราคา: ${role.price.coins?.toLocaleString() || 0} เหรียญ ` +
                                `${role.price.gems ? `+ ${role.price.gems} เพชร` : ''}\n` +
                                `┣ 📈 โบนัส: +${((role.benefits.expBonus - 1) * 100).toFixed(0)}%\n` +
                                `┗ 📝 ${role.description}`
                            ).join('\n\n')
                        },
                        {
                            name: '🎮 ไอเทมพิเศษ',
                            value: shopData.items.map(item =>
                                `${item.name}\n` +
                                `┣ 💰 ราคา: ${item.price.coins?.toLocaleString() || 0} เหรียญ ` +
                                `${item.price.gems ? `+ ${item.price.gems} เพชร` : ''}\n` +
                                `┗ 📝 ${item.description}`
                            ).join('\n\n')
                        }
                    )
                    .setFooter({ 
                        text: '💡 ใช้ /shop buy เพื่อซื้อไอเทม',
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            } else if (subcommand === 'buy') {
                const itemId = interaction.options.getString('item');
                const result = await ShopSystem.buyItem(interaction.user.id, interaction.guild.id, itemId);

                if (!result.success) {
                    const reasons = {
                        'item_not_found': 'ไม่พบไอเทมนี้',
                        'not_enough_coins': 'เหรียญไม่พอ',
                        'not_enough_gems': 'เพชรไม่พอ'
                    };
                    return await interaction.editReply({
                        content: `❌ ${reasons[result.reason] || 'เกิดข้อผิดพลาด'}`,
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🛍️ ซื้อไอเทมสำเร็จ!')
                    .setDescription(`คุณได้ซื้อ **${result.item.name}**`)
                    .addFields(
                        { name: '💰 ราคา', value: `${result.item.price.coins || 0} เหรียญ ${result.item.price.gems ? `+ ${result.item.price.gems} เพชร` : ''}` },
                        { name: '💳 ยอดคงเหลือ', value: `${result.newBalance.coins} เหรียญ, ${result.newBalance.gems} เพชร` }
                    )
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in shop command:', error);
            return await interaction.editReply({
                content: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                ephemeral: true
            });
        }
    }
};