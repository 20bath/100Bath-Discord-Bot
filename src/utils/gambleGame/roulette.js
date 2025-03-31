// const BaseGame = require('./baseGame');
// const economy = require('../economySystem');

// class RouletteGame extends BaseGame {
//     constructor() {
//         super();
//         this.name = 'roulette';
//         this.description = 'เกมรูเล็ตต์';
//         this.minBet = 100;
//         this.maxBet = 50000;
//         this.cooldown = 5000;
//         this.activeGames = new Map();

//         // กำหนดตัวเลขและสีบนวงล้อรูเล็ตต์
//         this.wheel = [
//             { number: 0, color: 'green' },
//             { number: 32, color: 'red' }, { number: 15, color: 'black' },
//             { number: 19, color: 'red' }, { number: 4, color: 'black' },
//             { number: 21, color: 'red' }, { number: 2, color: 'black' },
//             { number: 25, color: 'red' }, { number: 17, color: 'black' },
//             { number: 34, color: 'red' }, { number: 6, color: 'black' },
//             { number: 27, color: 'red' }, { number: 13, color: 'black' },
//             { number: 36, color: 'red' }, { number: 11, color: 'black' },
//             { number: 30, color: 'red' }, { number: 8, color: 'black' },
//             { number: 23, color: 'red' }, { number: 10, color: 'black' },
//             { number: 5, color: 'red' }, { number: 24, color: 'black' },
//             { number: 16, color: 'red' }, { number: 33, color: 'black' },
//             { number: 1, color: 'red' }, { number: 20, color: 'black' },
//             { number: 14, color: 'red' }, { number: 31, color: 'black' },
//             { number: 9, color: 'red' }, { number: 22, color: 'black' },
//             { number: 18, color: 'red' }, { number: 29, color: 'black' },
//             { number: 7, color: 'red' }, { number: 28, color: 'black' },
//             { number: 12, color: 'red' }, { number: 35, color: 'black' },
//             { number: 3, color: 'red' }, { number: 26, color: 'black' }
//         ];

//         // กำหนดอัตราการจ่ายเงิน
//         this.payouts = {
//             number: 35, // เลขเดี่ยว จ่าย 35:1
//             color: 2,   // สี จ่าย 2:1
//             dozen: 3,   // โหล (1-12, 13-24, 25-36) จ่าย 3:1
//             half: 2,    // ครึ่ง (1-18, 19-36) จ่าย 2:1
//         };
//     }

//     async validate(userId, bet) {
//         const profile = await economy.getProfile(userId);
//         if (!profile) return { valid: false, reason: 'no_profile' };
//         if (profile.balance < bet) return { valid: false, reason: 'insufficient_funds' };
//         if (bet < this.minBet) return { valid: false, reason: 'bet_too_low' };
//         if (bet > this.maxBet) return { valid: false, reason: 'bet_too_high' };

//         const cooldown = await this.checkCooldown(userId);
//         if (cooldown > 0) return { valid: false, reason: 'cooldown' };

//         return { valid: true };
//     }

//     async play(userId, bet, choice) {
//         // Validate choice parameter
//         if (!choice || !choice.type || !choice.value) {
//             return { success: false, reason: 'invalid_choice' };
//         }
    
//         // หักเงินเดิมพัน
//         await economy.addMoney(userId, -bet);
//         await this.setCooldown(userId);
    
//         // สุ่มผลลัพธ์
//         const result = this.wheel[Math.floor(Math.random() * this.wheel.length)];
        
//         // ตรวจสอบการชนะและคำนวณเงินรางวัล
//         const winAmount = this.calculateWinAmount(bet, choice, result);
        
//         // ถ้าชนะให้เพิ่มเงินรางวัล
//         if (winAmount > 0) {
//             await economy.addMoney(userId, winAmount);
//         }
    
//         // อัพเดทสถิติ
//         const profile = await economy.getProfile(userId);
//         await economy.updateProfile(userId, {
//             "stats.gamblingStats.gamesPlayed": profile.stats.gamblingStats.gamesPlayed + 1,
//             "stats.gamblingStats.won": winAmount > 0 ? profile.stats.gamblingStats.won + 1 : profile.stats.gamblingStats.won,
//             "stats.gamblingStats.lost": winAmount === 0 ? profile.stats.gamblingStats.lost + 1 : profile.stats.gamblingStats.lost,
//             "stats.gamblingStats.totalWagered": profile.stats.gamblingStats.totalWagered + bet
//         });
    
//         return {
//             success: true,
//             result: result,
//             winAmount: winAmount,
//             bet: bet,
//             choice: choice
//         };
//     }

//     calculateWinAmount(bet, choice, result) {
//         // ตรวจสอบการชนะตามประเภทการเดิมพัน
//         if (choice.type === 'number') {
//             return choice.value === result.number ? bet * this.payouts.number : 0;
//         }
        
//         if (choice.type === 'color') {
//             return choice.value === result.color ? bet * this.payouts.color : 0;
//         }

//         if (choice.type === 'dozen') {
//             const num = result.number;
//             const dozen = choice.value; // 1, 2, or 3
//             const inDozen = (dozen === 1 && num <= 12) ||
//                           (dozen === 2 && num > 12 && num <= 24) ||
//                           (dozen === 3 && num > 24);
//             return inDozen ? bet * this.payouts.dozen : 0;
//         }

//         if (choice.type === 'half') {
//             const num = result.number;
//             const half = choice.value; // 1 (1-18) or 2 (19-36)
//             const inHalf = (half === 1 && num <= 18) ||
//                          (half === 2 && num > 18);
//             return inHalf ? bet * this.payouts.half : 0;
//         }

//         return 0;
//     }

//     getWheelNumbers() {
//         return this.wheel;
//     }
// }

// module.exports = new RouletteGame();