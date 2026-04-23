const admin = require('firebase-admin');
const PushToken = require('../models/PushToken');
const catchAsync = require('../utils/catchAsync');

const serviceAccount = require('../config/firebase-adminsdk.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

exports.saveToken = catchAsync(async (req, res, next) => {
    const { token, device, userId } = req.body;

    if (!token) {
        return res.status(400).json({ status: 'fail', message: 'التوكن مطلوب' });
    }

    const updateData = { token, device };
    
    if (userId) {
        updateData.userId = userId;
    }

    await PushToken.findOneAndUpdate(
        { token: token },
        updateData,
        { upsert: true, new: true }
    );

    res.status(200).json({ 
        status: 'success', 
        message: 'تم حفظ التوكن بنجاح' 
    });
});

exports.sendGlobalNotification = catchAsync(async (req, res, next) => {
    const { title, body, url } = req.body;

    const tokens = await PushToken.find().distinct('token');

    if (!tokens || tokens.length === 0) {
        return res.status(404).json({ status: 'fail', message: 'لا توجد أجهزة مسجلة لإرسال الإشعارات' });
    }

    const message = {
        notification: { 
            title: title || 'إشعار جديد', 
            body: body || '' 
        },
        data: { 
            type: 'update', 
            url: url || ''  
        }, 
        tokens: tokens 
    };

const response = await admin.messaging().sendEachForMulticast(message);
    
    res.status(200).json({
        status: 'success',
        message: `تم الإرسال بنجاح. أجهزة استلمت: ${response.successCount}, أجهزة فشلت: ${response.failureCount}`
    });
});