const admin = require("firebase-admin");
const PushToken = require("../models/PushToken");
const catchAsync = require("../utils/catchAsync");

const serviceAccount = require("../config/firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.saveToken = catchAsync(async (req, res, next) => {
  const { token, device, userId } = req.body;

  if (!token) {
    return res.status(400).json({ status: "fail", message: "التوكن مطلوب" });
  }

  const updateData = { token, device };

  if (userId) {
    updateData.userId = userId;
  }

  await PushToken.findOneAndUpdate({ token: token }, updateData, {
    upsert: true,
    returnDocument: "after",
  });

  res.status(200).json({
    status: "success",
    message: "تم حفظ التوكن بنجاح",
  });
});

exports.sendGlobalNotification = catchAsync(async (req, res, next) => {
  const { title, body, url, section, surah, page, ayah } = req.body;

  const tokens = await PushToken.find().distinct("token");

  if (!tokens || tokens.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "لا توجد أجهزة مسجلة لإرسال الإشعارات",
    });
  }

  const notificationData = {
    type: "update",
  };

  if (url) notificationData.url = String(url);
  if (section) notificationData.section = String(section);
  if (surah) notificationData.surah = String(surah);
  if (page) notificationData.page = String(page);
  if (ayah) notificationData.ayah = String(ayah);

  const message = {
    notification: {
      title: title || "إشعار جديد",
      body: body || "",
    },
    data: notificationData,
    tokens: tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  if (response.failureCount > 0) {
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`الفشل في التوكن رقم ${idx}:`, resp.error.code);

        if (
          resp.error.code === "messaging/registration-token-not-registered" ||
          resp.error.code === "messaging/invalid-registration-token"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await PushToken.deleteMany({ token: { $in: failedTokens } });
      console.log(`تم تنظيف ${failedTokens.length} توكن غير صالح من القاعدة.`);
    }
  }

  res.status(200).json({
    status: "success",
    message: `تم الإرسال بنجاح. أجهزة استلمت: ${response.successCount}, أجهزة فشلت: ${response.failureCount}`,
  });
});
