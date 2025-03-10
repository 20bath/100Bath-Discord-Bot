const RoleManager = require('../utils/roleManager');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) {
                await reaction.fetch();
            }

            const { message, emoji } = reaction;
            const roleData = await RoleManager.getReactionRole(
                message.guild.id,
                message.id,
                emoji.name
            );

            if (roleData) {
                const member = await message.guild.members.fetch(user.id);
                const role = message.guild.roles.cache.get(roleData.roleId);

                // เช็คสิทธิ์ของบอท
                const botMember = message.guild.members.cache.get(message.client.user.id);
                if (!botMember.permissions.has('MANAGE_ROLES')) {
                    console.error('Bot is missing MANAGE_ROLES permission');
                    await user.send('❌ ขออภัย บอทไม่มีสิทธิ์ในการจัดการยศ');
                    return;
                }

                // เช็คว่าบอทมีสิทธิ์จัดการยศนั้นหรือไม่
                if (role.position >= botMember.roles.highest.position) {
                    console.error('Bot cannot manage this role - role is higher than bot\'s highest role');
                    await user.send('❌ ขออภัย บอทไม่สามารถจัดการยศนี้ได้เนื่องจากยศอยู่สูงกว่าบอท');
                    return;
                }

                if (role) {
                    await member.roles.add(role);
                    await user.send(`✅ คุณได้รับยศ ${role.name} แล้ว!`);
                }
            }
        } catch (error) {
            console.error('Error in reaction role add:', error);
            // ส่งข้อความแจ้งเตือนไปยังผู้ใช้
            try {
                await user.send('❌ เกิดข้อผิดพลาดในการเพิ่มยศ กรุณาติดต่อแอดมิน');
            } catch (dmError) {
                console.error('Could not send DM to user:', dmError);
            }
        }
    }
};