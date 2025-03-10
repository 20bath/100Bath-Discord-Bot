const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const RoleManager = require('../utils/roleManager');

module.exports = {
    name: 'setrole',
    description: 'ตั้งค่า Reaction Role',
    defaultMemberPermissions: PermissionFlagsBits.Administrator, // เฉพาะแอดมินเท่านั้น
    options: [
        {
            name: 'role',
            description: 'ยศที่ต้องการตั้งค่า',
            type: 8, // ROLE
            required: true
        },
        {
            name: 'emoji',
            description: 'อิโมจิที่ใช้',
            type: 3, // STRING
            required: true
        },
        {
            name: 'title',
            description: 'หัวข้อของ Reaction Role',
            type: 3, // STRING
            required: false
        },
        {
            name: 'description',
            description: 'คำอธิบายเพิ่มเติม',
            type: 3, // STRING
            required: false
        },
        {
            name: 'color',
            description: 'สีของ Embed (เช่น #FF0000)',
            type: 3, // STRING
            required: false
        }
    ],
    async execute(interaction) {
        // ตรวจสอบสิทธิ์ขั้นสูง
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลระบบเท่านั้น',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const emoji = interaction.options.getString('emoji');
        const title = interaction.options.getString('title') || '🎭 Reaction Role';
        const customDesc = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#00ff00';

        // ตรวจสอบรูปแบบสี
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(color)) {
            return interaction.reply({
                content: '❌ รูปแบบสีไม่ถูกต้อง กรุณาใช้รูปแบบ Hex เช่น #FF0000',
                ephemeral: true
            });
        }

        try {
            // สร้าง Embed ที่ปรับแต่งได้
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(customDesc || `กดที่ ${emoji} เพื่อรับยศ ${role}`)
                .addFields(
                    { 
                        name: 'ยศที่จะได้รับ', 
                        value: `${role}`, 
                        inline: true 
                    },
                    { 
                        name: 'Emoji', 
                        value: emoji, 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: `ตั้งค่าโดย ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // ส่ง Embed และเพิ่ม Reaction
            const message = await interaction.channel.send({ embeds: [embed] });
            await message.react(emoji);

            // บันทึกข้อมูลลง Firebase
            await RoleManager.addReactionRole(
                interaction.guild.id,
                message.id,
                emoji,
                role.id
            );

            // แจ้งเตือนการตั้งค่าสำเร็จ
            await interaction.reply({
                content: '✅ ตั้งค่า Reaction Role สำเร็จ!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting up reaction role:', error);
            await interaction.reply({
                content: '❌ เกิดข้อผิดพลาดในการตั้งค่า: ' + error.message,
                ephemeral: true
            });
        }
    }
};