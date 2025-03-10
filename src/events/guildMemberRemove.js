// แจ้งเตือนเมื่อมีคนออกจากเซิร์ฟเวอร์
module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
      try {
        // ช่องสำหรับส่งข้อความแจ้งเตือนคนออก (แก้ไข ID ตามต้องการ)
        const leaveChannel = member.guild.channels.cache.get('1348538341481512992');
        
        if (!leaveChannel) return;
  
        const embed = {
          color: 0xff0000, // สีแดง
          title: '👋 สมาชิกออกจากเซิร์ฟเวอร์',
          description: `**${member.user.tag}** ได้ออกจากเซิร์ฟเวอร์`,
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
  
        await leaveChannel.send({ embeds: [embed] });
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการส่งข้อความแจ้งเตือน:', error);
      }
    }
  };