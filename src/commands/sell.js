const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomySystem = require('../utils/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('ขายไอเทมในกระเป๋า')
        .addSubcommand(subcommand =>
            subcommand
                .setName('item')
                .setDescription('ขายไอเทมที่เลือก')
                .addStringOption(option =>
                    option
                        .setName('item_id')
                        .setDescription('ไอเทมที่ต้องการขาย')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('จำนวนที่ต้องการขาย')
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('ขายไอเทมทั้งหมดในกระเป๋า')
        ),

    async autocomplete(interaction) {
        try {
            const profile = await EconomySystem.getProfile(interaction.user.id);
            if (!profile?.inventory) return;

            const focused = interaction.options.getFocused().toLowerCase();
            const choices = profile.inventory
                .filter(item => 
                    item.type === 'work_item' && 
                    (item.name.toLowerCase().includes(focused) || 
                     item.id.toLowerCase().includes(focused))
                )
                .map(item => ({
                    name: `${item.name} (${item.value} บาท)`,
                    value: item.id
                }));

            await interaction.respond(choices.slice(0, 25));
        } catch (error) {
            console.error('Error in sell autocomplete:', error);
        }
    },

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const profile = await EconomySystem.getProfile(interaction.user.id);

            if (!profile?.inventory || profile.inventory.length === 0) {
                return interaction.reply({
                    content: '❌ คุณไม่มีไอเทมในกระเป๋า',
                    flags: ['Ephemeral']
                });
            }

            if (subcommand === 'item') {
                const itemId = interaction.options.getString('item_id');
                const amount = interaction.options.getInteger('amount') || 1;

                // หาไอเทมทั้งหมดที่ตรงกับ ID
                const items = profile.inventory.filter(item => 
                    item.id === itemId && item.type === 'work_item'
                );

                if (items.length === 0) {
                    return interaction.reply({
                        content: '❌ ไม่พบไอเทมที่ระบุ',
                        flags: ['Ephemeral']
                    });
                }

                if (items.length < amount) {
                    return interaction.reply({
                        content: `❌ คุณมี ${items.length} ชิ้น ไม่พอที่จะขาย ${amount} ชิ้น`,
                        flags: ['Ephemeral']
                    });
                }

                // คำนวณราคารวม
                const totalValue = items.slice(0, amount).reduce((sum, item) => sum + item.value, 0);

                // ลบไอเทมและเพิ่มเงิน
                const newInventory = profile.inventory.filter((item, index) => {
                    const isTarget = item.id === itemId && item.type === 'work_item';
                    const keepCount = items.length - amount;
                    return !isTarget || (isTarget && index >= keepCount);
                });

                const newBalance = await EconomySystem.addMoney(interaction.user.id, totalValue);
                await EconomySystem.updateProfile(interaction.user.id, { inventory: newInventory });

                const embed = new EmbedBuilder()
                    .setTitle('💰 ขายไอเทมสำเร็จ')
                    .setColor('#00ff00')
                    .addFields(
                        {
                            name: '🎁 ไอเทมที่ขาย',
                            value: `${items[0].name} x${amount}`,
                            inline: true
                        },
                        {
                            name: '💵 ราคาขาย',
                            value: `${totalValue} บาท`,
                            inline: true
                        },
                        {
                            name: '💰 ยอดเงินคงเหลือ',
                            value: `${newBalance} บาท`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'all') {
                const workItems = profile.inventory.filter(item => item.type === 'work_item');
                if (workItems.length === 0) {
                    return interaction.reply({
                        content: '❌ ไม่มีไอเทมที่สามารถขายได้',
                        flags: ['Ephemeral']
                    });
                }

                const totalValue = workItems.reduce((sum, item) => sum + item.value, 0);
                const newInventory = profile.inventory.filter(item => item.type !== 'work_item');
                
                const newBalance = await EconomySystem.addMoney(interaction.user.id, totalValue);
                await EconomySystem.updateProfile(interaction.user.id, { inventory: newInventory });

                const embed = new EmbedBuilder()
                    .setTitle('💰 ขายไอเทมทั้งหมดสำเร็จ')
                    .setColor('#00ff00')
                    .addFields(
                        {
                            name: '📦 จำนวนไอเทมที่ขาย',
                            value: `${workItems.length} ชิ้น`,
                            inline: true
                        },
                        {
                            name: '💵 ราคาขายรวม',
                            value: `${totalValue} บาท`,
                            inline: true
                        },
                        {
                            name: '💰 ยอดเงินคงเหลือ',
                            value: `${newBalance} บาท`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in sell command:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการขายไอเทม',
                flags: ['Ephemeral']
            });
        }
    }
};