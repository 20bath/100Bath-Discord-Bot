class LevelRoles {
    // สีพาสเทลสำหรับแต่ละช่วง Level
    static getPastelColor(level) {
        const colors = [
            '#FFB3BA', // สีชมพูพาสเทล
            '#BAFFC9', // สีเขียวพาสเทล
            '#BAE1FF', // สีฟ้าพาสเทล
            '#FFFFBA', // สีเหลืองพาสเทล
            '#E8BAFF', // สีม่วงพาสเทล
            '#FFD1BA', // สีส้มพาสเทล
            '#B3FFF8', // สีเทอร์ควอยซ์พาสเทล
            '#FFC8E6', // สีชมพูอ่อนพาสเทล
            '#D1FFB3', // สีเขียวอ่อนพาสเทล
            '#B3F0FF'  // สีฟ้าอ่อนพาสเทล
        ];
        // วนกลับไปใช้สีซ้ำถ้า level มากกว่าจำนวนสี
        return colors[level % colors.length];
    }

    // รับชื่อยศตาม Level
    static getRoleName(level) {
        return `💫 Level ${level}`;
    }

    // ตรวจสอบและสร้างยศใหม่ถ้ายังไม่มี
    static async ensureRoleExists(guild, level) {
        try {
            const roleName = this.getRoleName(level);
            let role = guild.roles.cache.find(r => r.name === roleName);
    
            if (!role) {
                console.log(`กำลังสร้างยศ ${roleName}...`);
                
                // ตรวจสอบสิทธิ์ของบอท
                const botMember = guild.members.cache.get(guild.client.user.id);
                if (!botMember.permissions.has('MANAGE_ROLES')) {
                    console.error('Bot is missing MANAGE_ROLES permission');
                    return null;
                }
    
                try {
                    role = await guild.roles.create({
                        name: roleName,
                        color: this.getPastelColor(level),
                        reason: `Auto-created role for level ${level}`,
                        permissions: []
                    });
                    console.log(`✅ สร้างยศ ${roleName} สำเร็จ`);
                } catch (createError) {
                    console.error(`❌ ไม่สามารถสร้างยศ ${roleName}:`, createError);
                    return null;
                }
            }
    
            return role;
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจสอบ/สร้างยศ:', error);
            return null;
        }
    }

    // อัพเดทยศของสมาชิกตาม Level
    static async updateMemberRoles(member, newLevel) {
        try {
            // ตรวจสอบว่ามี member object
            if (!member) {
                console.error('ไม่พบข้อมูลสมาชิก');
                return false;
            }
    
            // ตรวจสอบสิทธิ์ของบอท
            const botMember = member.guild.members.cache.get(member.guild.client.user.id);
            if (!botMember.permissions.has('MANAGE_ROLES')) {
                console.error('Bot is missing MANAGE_ROLES permission');
                return false;
            }
    
            // สร้างยศใหม่ถ้ายังไม่มี
            const newRole = await this.ensureRoleExists(member.guild, newLevel);
            if (!newRole) {
                console.error('ไม่สามารถสร้าง/หายศได้');
                return false;
            }
    
            console.log(`กำลังอัพเดทยศสำหรับ ${member.user.tag} เป็น ${newRole.name}`);
    
            // ลบยศ Level เก่า
            const oldRoles = member.roles.cache.filter(role => 
                role.name.startsWith('💫 Level ')
            );
            
            try {
                if (oldRoles.size > 0) {
                    await Promise.all(oldRoles.map(role => member.roles.remove(role)));
                    console.log(`ลบยศเก่าสำเร็จ: ${oldRoles.map(r => r.name).join(', ')}`);
                }
    
                // เพิ่มยศใหม่
                await member.roles.add(newRole);
                console.log(`เพิ่มยศใหม่สำเร็จ: ${newRole.name}`);
                return true;
            } catch (roleError) {
                console.error('เกิดข้อผิดพลาดในการอัพเดทยศ:', roleError);
                return false;
            }
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการอัพเดทยศ:', error);
            return false;
        }
    }
}

module.exports = LevelRoles;