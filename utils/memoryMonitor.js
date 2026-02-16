const axios = require('axios');

const monitorMemory = () => {
    const MEMORY_THRESHOLD_MB = 200; 
    
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    setInterval(async () => {
        const { rss } = process.memoryUsage();
        const rssMB = Math.round(rss / 1024 / 1024);

        console.log(`📊 الذاكرة الحالية: ${rssMB}MB`);

        if (rssMB > MEMORY_THRESHOLD_MB) {
            console.warn(`🚨 تحذير: استهلاك ذاكرة مرتفع! (${rssMB}MB)`);

            if (TELEGRAM_TOKEN && CHAT_ID) {
                try {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                        chat_id: CHAT_ID,
                        text: `⚠️ *تنبيه من سيرفر اقرأ*\n\nالتطبيق يقترب من استهلاك كامل الذاكرة!\nالاستهلاك الحالي: *${rssMB}MB*\nالسيرفر قد يتوقف قريباً.`,
                        parse_mode: 'Markdown'
                    });
                } catch (err) {
                    console.error('فشل إرسال تنبيه تليجرام:', err.message);
                }
            }
        }
    }, 60000); // فحص كل دقيقة واحدة
};

module.exports = monitorMemory;