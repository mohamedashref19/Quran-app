const Ayah = require("../models/Ayah")
const Recitation=require("../models/recitationModel")
const Khatmah = require('../models/Khatmah'); 
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");


// ─── تطبيع النص العربي للبحث (نفس منطق الـ Frontend تمامًا) ─────────────────
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    // إزالة التشكيل والحركات كاملاً
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
    // توحيد أشكال الألف
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد الياء والألف المقصورة
    .replace(/ى/g, 'ي')
    // توحيد الواو والواو بهمزة
    .replace(/ؤ/g, 'و')
    // توحيد الياء بهمزة
    .replace(/ئ/g, 'ي')
    // إزالة علامة الوقف
    .replace(/۩/g, '')
    // إزالة مسافات زائدة
    .trim();
  // ملاحظة: لا نوحّد ة→ه هنا عشان نحافظ على دقة البحث
};


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

// ─── البحث الذكي ──────────────────────────────────────────────────────────────
exports.search = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return next(new AppError("يرجى كتابة كلمتين على الأقل للبحث", 400));
  }

  const query = q.trim();
  const normalizedQuery = normalizeArabic(query);
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);

  // ─── 1. البحث برقم السورة والآية (مثلاً: "2:255" أو "البقرة 255") ──────────
  const verseRefMatch = query.match(/^(\d+)[:\s]+(\d+)$/);
  if (verseRefMatch) {
    const surahNum = parseInt(verseRefMatch[1]);
    const ayahNum  = parseInt(verseRefMatch[2]);
    const ayah = await Ayah.findOne({ surahNumber: surahNum, numberInSurah: ayahNum })
      .select('text surahNameAr ayahNumber numberInSurah page surahNumber');
    
    if (ayah) {
      return res.status(200).json({
        status: "success",
        results: 1,
        searchType: "verse_ref",
        data: { ayahs: [ayah] }
      });
    }
  }

  // ─── 2. البحث بالنص المطبّع (بدون تشكيل) - الأسرع والأدق ───────────────────
  // simpleText: حقل محفوظ في DB بالنص بدون تشكيل (مطبّع مسبقًا عند الاستيراد)
  let results = await Ayah.find({
    simpleText: { $regex: normalizedQuery, $options: 'i' }
  })
  .select('text surahNameAr ayahNumber numberInSurah page surahNumber')
  .limit(limit)
  .lean();

  // ─── 3. لو ما فيش نتائج كافية → ابحث بالتشكيل الأصلي (fallback) ─────────────
  if (results.length === 0) {
    results = await Ayah.find({
      text: { $regex: query, $options: 'i' }
    })
    .select('text surahNameAr ayahNumber numberInSurah page surahNumber')
    .limit(limit)
    .lean();
  }

  // ─── 4. ترتيب النتائج: الآيات اللي فيها الكلمة في الأول تيجي أولاً ──────────
  results.sort((a, b) => {
    const aText = normalizeArabic(a.text || '');
    const bText = normalizeArabic(b.text || '');
    const aIdx = aText.indexOf(normalizedQuery);
    const bIdx = bText.indexOf(normalizedQuery);
    // الأقرب للأول في الآية تيجي أولاً
    if (aIdx !== bIdx) return aIdx - bIdx;
    // ثم ترتيب حسب السورة
    return (a.surahNumber - b.surahNumber) || (a.numberInSurah - b.numberInSurah);
  });

  res.status(200).json({
    status: "success",
    results: results.length,
    searchType: "text",
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

exports.getTafseerBySurah = catchAsync(async (req, res, next) => {
  const { surah } = req.params;
  const surahNum = Number(surah);

  if (!surahNum || surahNum < 1 || surahNum > 114) {
    return next(new AppError('رقم السورة غير صحيح', 400));
  }

  const ayahs = await Ayah.find({ surahNumber: surahNum })
    .sort({ ayahNumber: 1 })
    .select('ayahNumber tafseer -_id');

  if (!ayahs || ayahs.length === 0) {
    return next(new AppError('لم يتم العثور على تفسير لهذه السورة', 404));
  }

  res.status(200).json({
    status: 'success',
    results: ayahs.length,
    data: ayahs.map(a => ({
      ayah: a.ayahNumber,
      tafseer: a.tafseer || 'التفسير غير متوفر حالياً لهذه الآية'
    }))
  });
});

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


exports.saveRecitation = catchAsync(async(req,res,next)=>{
  if(!req.file){
    return next(new AppError('Please provide an audio file', 400));
  }
  const audioUrl = req.file.location

  const newRecitation = await Recitation.create({
    user: req.user.id,        
    audioUrl: audioUrl,       
    surah: req.body.surah,    
    startAyah: req.body.startAyah || 1,  
    endAyah: req.body.endAyah || 1  
  });

  res.status(200).json({
    status:"success",
    message:"File uploaded successfully to AWS S3",
    data:{
      url:audioUrl
    }
  })
})