// แจ้งเตือนเมื่อมีคนเข้าเซิร์ฟเวอร์
module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      // ช่องสำหรับส่งข้อความต้อนรับ
      const welcomeChannel = member.guild.channels.cache.get('1348538341481512991');
      
      // มอบยศ Community อัตโนมัติ
      const communityRole = member.guild.roles.cache.find(role => role.name === '「🌍」Community');
      
      if (communityRole) {
        try {
          await member.roles.add(communityRole);
          console.log(`✅ มอบยศ ${communityRole.name} ให้กับ ${member.user.tag} สำเร็จ`);
        } catch (roleError) {
          console.error('❌ เกิดข้อผิดพลาดในการมอบยศ:', roleError);
        }
      } else {
        console.error('❌ ไม่พบยศ Community');
      }

      // ส่งข้อความต้อนรับ (ถ้ามีช่อง welcome)
      if (welcomeChannel) {
        const embed = {
          color: 0x00ff00,
          title: '🎉 ยินดีต้อนรับสมาชิกใหม่!',
          description: `สวัสดี ${member} ยินดีต้อนรับสู่เซิร์ฟเวอร์ ${member.guild.name}\nคุณได้รับยศ ${communityRole} โดยอัตโนมัติ`,
          thumbnail: {
            url: member.user.displayAvatarURL({ dynamic: true })
          },
          fields: [
            {
              name: '📊 จำนวนสมาชิกปัจจุบัน',
              value: `${member.guild.memberCount} คน`
            }
          ],
          timestamp: new Date()
        };

        await welcomeChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการส่งข้อความต้อนรับ:', error);
    }
  }
};