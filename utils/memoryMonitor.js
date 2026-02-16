const axios = require('axios');

const startTime = new Date();

const monitorMemory = () => {
    const MEMORY_THRESHOLD_MB = 200; 
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    let lastUpdateId = 0; 

    setInterval(async () => {
        const { rss } = process.memoryUsage();
        const rssMB = Math.round(rss / 1024 / 1024);

        if (rssMB > MEMORY_THRESHOLD_MB) {
            await sendTelegramMessage(TELEGRAM_TOKEN, CHAT_ID, 
                `🚨 *تنبيه حرج!*\nاستهلاك الذاكرة مرتفع جداً: *${rssMB}MB*`);
        }
    }, 60000);

    setInterval(async () => {
        if (!TELEGRAM_TOKEN) return;
        
        try {
            const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`);
            const updates = response.data.result;

            for (const update of updates) {
                lastUpdateId = update.update_id;
                const messageText = update.message?.text?.toLowerCase();
                const senderId = update.message?.chat?.id?.toString();

                if (messageText === 'status' && senderId === CHAT_ID) {
                    const { rss, heapUsed } = process.memoryUsage();
                    const uptime = Math.round((new Date() - startTime) / 1000 / 60); 

                    const statusMsg = `🖥️ *حالة سيرفر اقرأ الآن:*\n\n` +
                        `✅ الذاكرة (RSS): *${Math.round(rss / 1024 / 1024)}MB*\n` +
                        `📊 الذاكرة (Heap): *${Math.round(heapUsed / 1024 / 1024)}MB*\n` +
                        `⏱️ وقت التشغيل: *${uptime} دقيقة*\n` +
                        `🌐 الحالة: *متصل وشغال*`;

                    await sendTelegramMessage(TELEGRAM_TOKEN, CHAT_ID, statusMsg);
                }
            }
        } catch (err) {
        }
    }, 5000); 
};

async function sendTelegramMessage(token, chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (err) {
        console.error('Telegram Error:', err.message);
    }
}

module.exports = monitorMemory;