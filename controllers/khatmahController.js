const Khatmah = require("../models/Khatmah");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email"); 

exports.createKhatmah = catchAsync(async (req, res, next) => {
  const { durationDays, name } = req.body;

  const activeKhatmah = await Khatmah.findOne({ 
    user: req.user.id, 
    status: "ongoing" 
  });

  if (activeKhatmah) {
    return next(new AppError("You already have an active Khatmah plan.", 400));
  }

  const newKhatmah = await Khatmah.create({
    user: req.user.id,
    durationDays,
    name,
  });

  res.status(201).json({
    status: "success",
    data: {
      khatmah: newKhatmah,
    },
  });
});

exports.getCurrentKhatmah = catchAsync(async (req, res, next) => {
  const khatmah = await Khatmah.findOne({ 
    user: req.user.id, 
    status: "ongoing" 
  });

  if (!khatmah) {
    return next(new AppError("No active Khatmah found.", 404));
  }

  const today = new Date();
  const diffTime = Math.abs(khatmah.endDate - today);
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  res.status(200).json({
    status: "success",
    data: {
      khatmah,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      message: `يلزمك قراءة حوالي ${khatmah.dailyTargetPages} صفحة يوميًا`
,
    },
  });
});



exports.updateProgress = catchAsync(async (req, res, next) => {
  const { surah, ayah ,page } = req.body;

  const khatmah = await Khatmah.findOneAndUpdate(
    { user: req.user.id, status: "ongoing" },
    { currentSurah: surah, currentAyah: ayah , page: page || 1},
    {  returnDocument: 'after' , runValidators: true }  
  );

  if (!khatmah) {
    return next(new AppError("No active Khatmah found to update.", 404));
  }

  let statusMessage = "Progress updated";

  if (Number(surah) === 114) {
    khatmah.status = "completed";
    await khatmah.save();
    statusMessage = "Mashallah! Khatmah Completed! 🎉";

    try {
      const url = `${req.protocol}://${req.get("host")}/my-khatmah`;
      await new Email(req.user, url).sendKhatmahCompletion();
    } catch (err) {
      console.error("Email error");
    }
  }

  const today = new Date();
  const diffTime = Math.abs(khatmah.endDate - today);
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const dailyMsg = `يلزمك قراءة حوالي ${khatmah.dailyTargetPages || 0} صفحة يوميًا`;

  res.status(200).json({
    status: "success",
    message: statusMessage, 
    data: {
      khatmah,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      message: dailyMsg 
    },
  });
});





exports.deleteKhatmah = catchAsync(async (req, res, next) => {
  await Khatmah.findOneAndDelete({ user: req.user.id, status: "ongoing" });

  res.status(204).json({
    status: "success",
    data: null,
  });
});