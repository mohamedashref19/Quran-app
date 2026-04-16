const Reciter = require("../models/Reciter");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllReciters = catchAsync(async (req, res, next) => {
  const reciters = await Reciter.find().sort({ order: 1 });

  res.status(200).json({
    status: "success",
    results: reciters.length,
    data: { reciters },
  });
});


exports.getStreamUrl = catchAsync(async (req, res, next) => {
  const { reciterId, surahNumber } = req.params;

  const reciter = await Reciter.findById(reciterId);
  if (!reciter) {
    return next(new AppError("Reciter not found", 404));
  }


  const padSurah = surahNumber.toString().padStart(3, "0");

  const audioUrl = `${reciter.server}${padSurah}.mp3`;

  res.status(200).json({
    status: "success",
    data: {
      reciter: reciter.name,
      surah: surahNumber,
      audioUrl: audioUrl, 
    },
  });
});

exports.getLiveStreams = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      makkah: [
        // ✅ رابط رسمي من Akamaized CDN - الأقوى والأكثر استقراراً
        "https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8",
        // ✅ رابط بديل من cdnamd
        "https://cdnamd-hls-globecast.akamaized.net/live/ramdisk/saudi_quran/hls1/saudi_quran.m3u8",
        // ✅ رابط إضافي
        "https://shd-gcp-live.edgenextcdn.net/live/bitmovin-ksa-now/71ed3aa814c643306c0a8bc4fcc7d17f/index.m3u8"
      ],
      madinah: [
        // ✅ رابط رسمي قناة السنة النبوية (المدينة) - من Akamaized
        "https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8",
        // ✅ رابط بديل من cdnamd
        "https://cdnamd-hls-globecast.akamaized.net/live/ramdisk/saudi_sunnah/hls1/saudi_sunnah.m3u8"
      ]
    }
  });
};