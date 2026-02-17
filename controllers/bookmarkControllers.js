const Bookmark = require("../models/Bookmark");
const Ayah = require("../models/Ayah");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.addBookmark = catchAsync(async (req, res, next) => {
  const { surahNumber, ayahNumber, note } = req.body;

  const ayahExists = await Ayah.findOne({ 
    surahNumber: surahNumber, 
    ayahNumber: ayahNumber 
  });

  if (!ayahExists) {
    return next(new AppError("Ayah not found!", 404));
  }

  const bookmark = await Bookmark.create({
    user: req.user.id,
    surah: surahNumber, 
    ayah: ayahNumber,   
    note
  });

  res.status(201).json({
    status: "success",
    data: { bookmark },
  });
});

exports.getMyBookmarks = catchAsync(async(req, res, next) => {
    const bookmarks = await Bookmark.find({ user: req.user.id }).sort("createdAt");
    
    const bookmarksWithText = await Promise.all(
        bookmarks.map(async(b) => {
            const ayahData = await Ayah.findOne({
                surahNumber: b.surah,
                ayahNumber: b.ayah
            }).select("text simpleText surahNameAr page"); 

            return {
                _id: b._id,
                surah: b.surah,
                ayah: b.ayah,
                note: b.note,
                createdAt: b.createdAt,
                ayahText: ayahData ? ayahData.text : "النص غير متوفر",
                surahName: ayahData ? ayahData.surahNameAr : "",
                page: ayahData ? ayahData.page : 1 
            };
        })
    );

    res.status(200).json({
        status: "success",
        results: bookmarks.length,
        data: {
            bookmarks: bookmarksWithText,
        },
    });
});

exports.deleteBookemark = catchAsync(async(req,res,next)=>{
    const bookmark = await Bookmark.findOneAndDelete({
        _id:req.params.id,
        user:req.user.id
    })
    if (!bookmark) {
    return next(new AppError("No bookmark found with that ID or you do not own it", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
})

exports.toggleBookmark = catchAsync(async (req, res, next) => {
  const { surahNumber, ayahNumber } = req.body;

  const existingBookmark = await Bookmark.findOne({
    user: req.user.id,
    surah: surahNumber,
    ayah: ayahNumber
  });

  if (existingBookmark) {
    await Bookmark.findByIdAndDelete(existingBookmark._id);
    return res.status(200).json({
      status: "success",
      message: "removed" 
    });
  }

  const bookmark = await Bookmark.create({
    user: req.user.id,
    surah: surahNumber,
    ayah: ayahNumber
  });

  res.status(201).json({
    status: "success",
    message: "added",
    data: { bookmark }
  });
});