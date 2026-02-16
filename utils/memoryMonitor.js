const axios = require('axios');
const User = require('../models/User'); 
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
                `🚨 *تنبيه حرج!*\nاستهلاك الذاكرة مرتفع: *${rssMB}MB*`);
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

                if (senderId !== CHAT_ID) continue;

                if (messageText === 'status') {
                    const { rss } = process.memoryUsage();
                    const totalUsers = await User.countDocuments();
                    const newUsersToday = await User.countDocuments({
                        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                    });
                    const uptime = Math.round((new Date() - startTime) / 1000 / 60);

                    const statusMsg = `🖥️ *حالة سيرفر اقرأ:*\n\n` +
                        `✅ الذاكرة: *${Math.round(rss / 1024 / 1024)}MB*\n` +
                        `⏱️ وقت التشغيل: *${uptime} دقيقة*\n` +
                        `🌐 الحالة: *متصل*\n\n` +
                        `📊 *إحصائيات تطبيق اقرأ:*\n\n` +
                        `👥 إجمالي المستخدمين: *${totalUsers}*\n` +
                        `✨ مستخدمين جدد (24س): *${newUsersToday}*\n\n` +
                        `📱 الحالة: *السيرفر يعمل بنجاح*`;
                    
                    await sendTelegramMessage(TELEGRAM_TOKEN, CHAT_ID, statusMsg);
                } 
                
                else if (messageText === 'restart') {
                    await sendTelegramMessage(TELEGRAM_TOKEN, CHAT_ID, "🔄 جاري إعادة تشغيل السيرفر الآن... سأعود للعمل خلال ثوانٍ.");
                    setTimeout(() => {
                        console.log('إعادة تشغيل يدوية بطلب من تليجرام...');
                        process.exit(1); 
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('Error in Bot Interface:', err.message);
        }
    }, 5000);

    setInterval(() => sendDailyStats(TELEGRAM_TOKEN, CHAT_ID), 24 * 60 * 60 * 1000);
};

const sendDailyStats = async (token, chatId) => {
    if (!token || !chatId) return;
    try {
        const totalUsers = await User.countDocuments();
        const newUsers = await User.countDocuments({
            createdAt: { $gt: new Date(Date.now() - 24*60*60*1000) }
        });

        const message = `📊 *تقرير يومي لتطبيق اقرأ:*\n\n` +
                        `👥 إجمالي المستخدمين: *${totalUsers}*\n` +
                        `✨ مستخدمين جدد (24س): *${newUsers}*\n` +
                        `📅 التاريخ: *${new Date().toLocaleDateString('ar-EG')}*`;

        await sendTelegramMessage(token, chatId, message);
    } catch (err) {
        console.error('فشل جلب الإحصائيات اليومية:', err.message);
    }
};

async function sendTelegramMessage(token, chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
    } catch (err) {
        console.error('Telegram API Error:', err.message);
    }
}

module.exports = monitorMemory;