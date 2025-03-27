const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const ShopSystem = require('../utils/shopSystem');
const EconomySystem = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('ร้านค้าไอเทมและยศพิเศษ (ยังใช้งานสินค้าไม่ได้)'),

    async execute(interaction) {
        try {
            const profile = await EconomySystem.getProfile(interaction.user.id);
            
            // สร้าง embed หลัก
            const embed = new EmbedBuilder()
                .setTitle('🏪 ร้านค้า (ยังใช้สินค้าไม่ได้ ถ้าซื้อไปจะไม่รับผิดชอบ)')
                .setColor('#ffd700')
                .setDescription('เลือกหมวดหมู่สินค้าที่ต้องการ')
                .addFields({
                    name: '💰 ยอดเงินของคุณ',
                    value: `${profile.balance} บาท`,
                    inline: true
                });

            // สร้าง select menu สำหรับหมวดหมู่
            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId('shop_category')
                .setPlaceholder('เลือกหมวดหมู่')
                .addOptions([
                    {
                        label: 'อุปกรณ์ถาวร',
                        description: 'ไอเทมที่ใช้ได้ตลอด',
                        value: 'permanent',
                        emoji: '🛡️'
                    },
                    {
                        label: 'ไอเทมชั่วคราว',
                        description: 'ไอเทมที่มีระยะเวลาจำกัด',
                        value: 'temporary',
                        emoji: '⏳'
                    },
                    {
                        label: 'ยศพิเศษ',
                        description: 'ยศที่มีสิทธิพิเศษ',
                        value: 'roles',
                        emoji: '👑'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(categorySelect);
            const response = await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                fetchReply: true 
            });

            // สร้าง collector สำหรับ select menu
            const collector = response.createMessageComponentCollector({ 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: '❌ คุณไม่สามารถใช้เมนูนี้ได้', 
                        ephemeral: true 
                    });
                }

                if (i.customId === 'shop_category') {
                    const category = i.values[0];
                    const items = ShopSystem.getShopItems()[category];

                    // สร้าง embed แสดงสินค้าในหมวดหมู่
                    const categoryEmbed = new EmbedBuilder()
                        .setTitle(`🏪 ร้านค้า - ${getCategoryName(category)}`)
                        .setColor('#ffd700')
                        .setDescription('เลือกสินค้าที่ต้องการซื้อ')
                        .addFields({
                            name: '💰 ยอดเงินของคุณ',
                            value: `${profile.balance} บาท`,
                            inline: true
                        });

                    // สร้างปุ่มสำหรับแต่ละไอเทม
                    const buttons = Object.values(items).map(item => {
                        return new ButtonBuilder()
                            .setCustomId(`buy_${item.id}`)
                            .setLabel(`${item.name} (${item.price} บาท)`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(profile.balance < item.price);
                    });

                    // จัดกลุ่มปุ่ม (สูงสุด 5 ปุ่มต่อแถว)
                    const buttonRows = [];
                    for (let i = 0; i < buttons.length; i += 5) {
                        buttonRows.push(
                            new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
                        );
                    }

                    // เพิ่มปุ่มกลับ
                    const backButton = new ButtonBuilder()
                        .setCustomId('shop_back')
                        .setLabel('กลับไปหน้าหลัก')
                        .setStyle(ButtonStyle.Secondary);

                    buttonRows.push(new ActionRowBuilder().addComponents(backButton));

                    await i.update({ 
                        embeds: [categoryEmbed], 
                        components: buttonRows 
                    });
                } else if (i.customId.startsWith('buy_')) {
                    const itemId = i.customId.replace('buy_', '');
                    const result = await ShopSystem.buyItem(
                        i.user.id, 
                        itemId,
                        interaction.guildId
                    );

                    if (!result.success) {
                        const errorMessages = {
                            'insufficient_funds': '❌ ยอดเงินไม่เพียงพอ',
                            'already_owned': '❌ คุณมีไอเทมนี้อยู่แล้ว',
                            'item_not_found': '❌ ไม่พบไอเทมนี้',
                        };

                        await i.reply({
                            content: errorMessages[result.reason] || '❌ เกิดข้อผิดพลาด',
                            ephemeral: true
                        });
                        return;
                    }

                    // แสดงผลการซื้อ
                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ ซื้อสำเร็จ!')
                        .setColor('#00ff00')
                        .addFields(
                            {
                                name: '🎁 ไอเทม',
                                value: result.item.name,
                                inline: true
                            },
                            {
                                name: '💰 ราคา',
                                value: `${result.item.price} บาท`,
                                inline: true
                            },
                            {
                                name: '💵 ยอดเงินคงเหลือ',
                                value: `${result.newBalance} บาท`,
                                inline: true
                            }
                        );

                    await i.reply({ 
                        embeds: [successEmbed], 
                        ephemeral: true 
                    });
                } else if (i.customId === 'shop_back') {
                    await i.update({ 
                        embeds: [embed], 
                        components: [row] 
                    });
                }
            });

            collector.on('end', () => {
                interaction.editReply({ 
                    components: [] 
                });
            });

        } catch (error) {
            console.error('Shop error:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการใช้งานร้านค้า',
                ephemeral: true
            });
        }
    }
};

function getCategoryName(category) {
    const names = {
        permanent: '🛡️ อุปกรณ์ถาวร',
        temporary: '⏳ ไอเทมชั่วคราว',
        roles: '👑 ยศพิเศษ'
    };
    return names[category] || category;
}