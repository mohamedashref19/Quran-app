const { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } = require('adhan');
const { find } = require('geo-tz');
const axios = require('axios');
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getPrayerTimes = catchAsync(async (req, res, next) => {
  let { lat, lng, method, date, madhab } = req.query;

  if (!lat || !lng) {
    return next(new AppError("Please provide latitude (lat) and longitude (lng)!", 400));
  }

  const coordinates = new Coordinates(parseFloat(lat), parseFloat(lng));
  // const dateObj = date ? new Date(date) : new Date();
   // 1. تحديد المنطقة الزمنية من الإحداثيات
  let userTimeZone = "Africa/Cairo"; 
  try {
    const tzArray = find(parseFloat(lat), parseFloat(lng));
    if (tzArray && tzArray.length > 0) {
        userTimeZone = tzArray[0]; 
    }
  } catch (err) {
    console.error("Timezone error:", err);
  }
  let dateObj;
if (date) {
  dateObj = new Date(date);
} else {
  // تحويل الوقت الحالي لتوقيت المستخدم بطريقة أضمن
  const now = new Date();
  const offsetStr = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(now);
  
  const p = {};
  offsetStr.forEach(({ type, value }) => { p[type] = value; });
  dateObj = new Date(`${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}`);
}

 

  // 2. الاختيار الذكي لطريقة الحساب بناءً على المنطقة إذا لم يحددها المستخدم
  let params;
  let methodName = "";

  if (method === "MWL") { params = CalculationMethod.MuslimWorldLeague(); methodName = "Muslim World League"; } 
  else if (method === "ISNA") { params = CalculationMethod.NorthAmerica(); methodName = "ISNA"; } 
  else if (method === "MAKKAH") { params = CalculationMethod.UmmAlQura(); methodName = "Umm Al-Qura"; } 
  else if (method === "KARACHI") { params = CalculationMethod.Karachi(); methodName = "Karachi"; }
  else if (method === "DUBAI") { params = CalculationMethod.Dubai(); methodName = "Dubai"; }
  else if (method === "QATAR") { params = CalculationMethod.Qatar(); methodName = "Qatar"; }
  else if (method === "KUWAIT") { params = CalculationMethod.Kuwait(); methodName = "Kuwait"; }
  else if (method === "SINGAPORE") { params = CalculationMethod.Singapore(); methodName = "Singapore"; }
  else {
      // 🌟 التوجيه الذكي التلقائي 🌟
      if (userTimeZone.includes('Riyadh') || userTimeZone.includes('Saudi')) {
          params = CalculationMethod.UmmAlQura();
          methodName = "Umm Al-Qura (Auto-detected)";
      } else if (userTimeZone.includes('Dubai') || userTimeZone.includes('Muscat')) {
          params = CalculationMethod.Dubai();
          methodName = "Dubai (Auto-detected)";
      } else if (userTimeZone.includes('Qatar')) {
          params = CalculationMethod.Qatar();
          methodName = "Qatar (Auto-detected)";
      } else if (userTimeZone.includes('Kuwait')) {
          params = CalculationMethod.Kuwait();
          methodName = "Kuwait (Auto-detected)";
      } else if (userTimeZone.includes('Karachi') || userTimeZone.includes('Kabul')) {
          params = CalculationMethod.Karachi();
          methodName = "Karachi (Auto-detected)";
      } else if (userTimeZone.includes('America/')) {
          params = CalculationMethod.NorthAmerica();
          methodName = "ISNA (Auto-detected)";
      } else if (userTimeZone.includes('Europe/')) {
          params = CalculationMethod.MuslimWorldLeague();
          methodName = "MWL (Auto-detected)";
      } else {
          params = CalculationMethod.Egyptian();
          methodName = "Egyptian General Authority (Default)";
      }
  }

  // 3. ضبط قاعدة العشاء الخاصة بالسعودية (أم القرى) في رمضان
  if (methodName.includes("Umm Al-Qura")) {
      try {
          // استخراج رقم الشهر الهجري الحالي
          const hijriMonthFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', { month: 'numeric' });
          const hijriMonth = parseInt(hijriMonthFormatter.format(dateObj));
          
          // في رمضان (الشهر رقم 9) العشاء بعد المغرب بـ 120 دقيقة، غير كده 90 دقيقة
          if (hijriMonth === 9) {
              params.ishaInterval = 120;
          } else {
              params.ishaInterval = 90;
          }
      } catch (e) {
          params.ishaInterval = 90; // احتياطي
      }
  }

  if (madhab === "HANAFI") {
      params.madhab = Madhab.Hanafi;
  } else {
      params.madhab = Madhab.Shafi;
  }

  const prayerTimes = new PrayerTimes(coordinates, dateObj, params);

  const formatTime = (time) => {
    if (!time) return "N/A";
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: userTimeZone // توقيت منطقة المستخدم
    });
  };

  const currentPrayer = prayerTimes.currentPrayer();
  const nextPrayer = prayerTimes.nextPrayer();
  
  let nextPrayerName = "";
  let nextPrayerTimeRaw = null; 
  switch (nextPrayer) {
    case Prayer.Fajr: nextPrayerName = "Fajr"; nextPrayerTimeRaw = prayerTimes.fajr; break;
    case Prayer.Sunrise: nextPrayerName = "Sunrise"; nextPrayerTimeRaw = prayerTimes.sunrise; break;
    case Prayer.Dhuhr: nextPrayerName = "Dhuhr"; nextPrayerTimeRaw = prayerTimes.dhuhr; break;
    case Prayer.Asr: nextPrayerName = "Asr"; nextPrayerTimeRaw = prayerTimes.asr; break;
    case Prayer.Maghrib: nextPrayerName = "Maghrib"; nextPrayerTimeRaw = prayerTimes.maghrib; break;
    case Prayer.Isha: nextPrayerName = "Isha"; nextPrayerTimeRaw = prayerTimes.isha; break;
    case Prayer.None: nextPrayerName = "Fajr (Tomorrow)"; nextPrayerTimeRaw = prayerTimes.fajr; break; 
  }

  res.status(200).json({
      status: "success",
      data: {
        hijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
          day: 'numeric', 
          month: 'long',
          year : 'numeric'
        }).format(dateObj),
        // الأوقات المنسقة لعرضها في الشاشة (UI)
        timings: {
          Fajr: formatTime(prayerTimes.fajr),
          Sunrise: formatTime(prayerTimes.sunrise),
          Dhuhr: formatTime(prayerTimes.dhuhr),
          Asr: formatTime(prayerTimes.asr),
          Maghrib: formatTime(prayerTimes.maghrib),
          Isha: formatTime(prayerTimes.isha),
        },
        // 🌟 الإضافة الجديدة: الأوقات الأصلية الدقيقة جداً للجدولة (Scheduling) 🌟
        rawTimestamps: {
          Fajr: prayerTimes.fajr ? prayerTimes.fajr.getTime() : null,
          Dhuhr: prayerTimes.dhuhr ? prayerTimes.dhuhr.getTime() : null,
          Asr: prayerTimes.asr ? prayerTimes.asr.getTime() : null,
          Maghrib: prayerTimes.maghrib ? prayerTimes.maghrib.getTime() : null,
          Isha: prayerTimes.isha ? prayerTimes.isha.getTime() : null,
        },
        meta: {
          latitude: lat,
          longitude: lng,
          method: methodName, 
          madhab: params.madhab === Madhab.Hanafi ? "Hanafi" : "Shafi/Maliki/Hanbali",
          nextPrayer: nextPrayerName,
          nextPrayerTime: formatTime(nextPrayerTimeRaw),
          timezone: userTimeZone
        }
      },
    });
});

exports.getLocation = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ status: 'fail', message: 'Missing coordinates' });
    }

    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: { 
        format: 'json', 
        lat, 
        lon, 
        'accept-language': 'ar' 
      },
      headers: { 
        'User-Agent': 'AqraApp/1.0 (contact:mohamedashref2003195@gmail.com)' 
      }
    });

    res.status(200).json({
      status: 'success',
      data: response.data
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'فشل في تحديد الموقع' });
  }
};