const activeRobs = new Map();

const ROB_CONFIG = {
    COOLDOWN: 3600000, //เวลารอระหว่างการปล้น
    MIN_MONEY_TO_ROB: 500, //จำนวนเงินขั้นต่ำที่ต้องมีเพื่อปล้นได้
    SUCCESS_RATE: 4, //อัตราความสำเร็จของการปล้น
    MAX_STEAL_PERCENT: 25, //อัตราสูงสุดที่สามารถปล้นได้จากเงินของเป้าหมาย
    FINE_PERCENT: 30, //เปอร์เซ็นต์ที่ต้องจ่ายเป็นค่าปรับหากปล้นล้มเหลว
    DROP_CHANCE: 0.5, //โอกาสที่เงินจะตกหล่นระหว่างการปล้น
    DROP_PERCENT: { MIN: 10, MAX: 60 }, //เปอร์เซ็นต์ของเงินที่ตกหล่นระหว่างการปล้น
    FINE_SYSTEM: {
        BLOCK: {
            MIN: 1000,
            MAX: 2000,
        },
        FAIL: {
            MIN: 500,
            MAX: 1500,
        },
    },
};

async function checkRobberyCard(userId) {
    const shop = require('./shopSystem');
    const effects = await shop.checkEffects(userId);
    return effects.robbery_card || false;
}

module.exports = {
    activeRobs,
    ROB_CONFIG,
    checkRobberyCard
};