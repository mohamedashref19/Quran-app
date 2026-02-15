const Reciter = require("../models/Reciter");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllReciters = catchAsync(async (req, res, next) => {
  const reciters = await Reciter.find();

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