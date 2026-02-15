const Ayah = require("../models/Ayah")
const Khatmah = require('../models/Khatmah'); 
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");


exports.getAllSurah = catchAsync(async(req,res,next)=>{
    const surahs =await Ayah.aggregate([
        {
            $group:{
                _id:"$surahNumber",
                arabicName:{ $first: "$surahNameAr" },
                firstAyah:{ $first: "$text" },
                ayahCount: { $sum: 1 }
            }
        
        },{
            $sort:{_id:1}
        }
    ])
    res.status(200).json({
        status:"success",
        results:surahs.length,
        data:{
            surahs
        }
    })
})

exports.getSurah = catchAsync(async (req,res,next)=>{
    const {number} = req.params
const ayahs = await Ayah.find({ surahNumber: Number(number) }).sort({ ayahNumber: 1 });

    if (!ayahs || ayahs.length === 0) {
    return next(new AppError("No surah found with that number", 404));
  }
  res.status(200).json({
    status:"success",
    data:{
     surahNumber:number,
     name:ayahs[0].surahNameAr,
     ayahs:ayahs
    }
  })
})

exports.search = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q) return next(new AppError("Please provide a search term", 400));

  const results = await Ayah.find({
    $or: [
      { simpleText: { $regex: q, $options: "i" } },
      { text: { $regex: q, $options: "i" } }
    ]
  })
  .select('text surahNameAr numberInSurah page surahNumber') 
  .limit(20); 

  res.status(200).json({
    status: "success",
    results: results.length,
    data: { ayahs: results }
  });
});

exports.getTafser= catchAsync(async(req,res,next)=>{
    const {surah,ayah} = req.params
    const ayahData = await Ayah.findOne({
        surahNumber: Number(surah),
    ayahNumber: Number(ayah),
}).select("surahNameAr text tafseer")
    if (!ayahData) {
    return next(new AppError("Ayah not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      surah: surah,
      ayah: ayah,
      text: ayahData.text,
      tafseer: ayahData.tafseer || "التفسير غير متوفر حالياً لهذه الآية",
    },
  })

})

exports.getPage = catchAsync(async (req, res, next) => {
  const page = req.params.page * 1; 

  if (page < 1 || page > 604) {
      return next(new AppError("رقم الصفحة غير صحيح", 404));
  }

  const ayahs = await Ayah.find({ page: page }).sort({ surahNumber: 1, ayahNumber: 1 });
let currentKhatmah = null;
  if (req.user) {
  
currentKhatmah = await Khatmah.findOne({ 
    user: req.user.id 
  }).sort({ startDate: -1 });
  }
 


  res.status(200).json({
    status: "success",
    data: {
      page,
      ayahs,
      khatmah: currentKhatmah
    }
  });
});

exports.getSurahStartPage = catchAsync(async (req, res, next) => {
    const firstAyah = await Ayah.findOne({ surahNumber: req.params.surahNumber, ayahNumber: 1 });
    res.status(200).json({
        status: 'success',
        page: firstAyah.page
    });
});

exports.continueKhatmah = catchAsync(async (req, res, next) => {
  if (!req.user) return res.redirect('/login');

  const khatmah = await Khatmah.findOne({
    user: req.user.id,
    status: "ongoing"
  }).sort({ startDate: -1 });

  if (!khatmah) {
    return res.redirect('/quran/1');
  }

  const targetAyah = await Ayah.findOne({
    surahNumber: khatmah.currentSurah,
    ayahNumber: khatmah.currentAyah
  });

  const page = targetAyah ? targetAyah.page : 1;

  res.redirect(`/quran/${page}`);
});
