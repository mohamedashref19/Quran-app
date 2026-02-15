const { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } = require('adhan');
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getPrayerTimes = catchAsync(async (req, res, next) => {
  let { lat, lng, method, date, madhab } = req.query;

  if (!lat || !lng) {
    return next(new AppError("Please provide latitude (lat) and longitude (lng)!", 400));
  }

  const coordinates = new Coordinates(parseFloat(lat), parseFloat(lng));
  const dateObj = date ? new Date(date) : new Date();

  let params = CalculationMethod.Egyptian();
  let methodName = "Egyptian General Authority of Survey"; 
  if (method === "MWL") {
    params = CalculationMethod.MuslimWorldLeague();
    methodName = "Muslim World League";
  } 
  else if (method === "ISNA") {
    params = CalculationMethod.NorthAmerica();
    methodName = "Islamic Society of North America (ISNA)";
  } 
  else if (method === "MAKKAH") {
    params = CalculationMethod.UmmAlQura();
    methodName = "Umm Al-Qura University, Makkah";
  } 
  else if (method === "KARACHI") {
    params = CalculationMethod.Karachi();
    methodName = "University of Islamic Sciences, Karachi";
  }
  else if (method === "DUBAI") {
      params = CalculationMethod.Dubai();
      methodName = "Dubai";
  }
  else if (method === "QATAR") {
      params = CalculationMethod.Qatar();
      methodName = "Qatar";
  }
  else if (method === "KUWAIT") {
      params = CalculationMethod.Kuwait();
      methodName = "Kuwait";
  }
  else if (method === "SINGAPORE") {
      params = CalculationMethod.Singapore();
      methodName = "Singapore";
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
      date: dateObj.toDateString(),
hijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', 
        month: 'long',
        year : 'numeric'
    }).format(Date.now()),
          timings: {
        Fajr: formatTime(prayerTimes.fajr),
        Sunrise: formatTime(prayerTimes.sunrise),
        Dhuhr: formatTime(prayerTimes.dhuhr),
        Asr: formatTime(prayerTimes.asr),
        Maghrib: formatTime(prayerTimes.maghrib),
        Isha: formatTime(prayerTimes.isha),
      },
      meta: {
        latitude: lat,
        longitude: lng,
        method: methodName, 
        madhab: params.madhab === Madhab.Hanafi ? "Hanafi" : "Shafi/Maliki/Hanbali",
        nextPrayer: nextPrayerName,
        nextPrayerTime: formatTime(nextPrayerTimeRaw) 
      }
    },
  });
});