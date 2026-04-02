const DailyQuiz = require('../models/DailyQuiz');
const QuestionBank = require('../models/QuestionBank');
const catchAsync = require('../utils/catchAsync');

// ─── 1. جلب مسابقة اليوم (بشكل ذكي وعشوائي) ───
exports.getTodayQuiz = catchAsync(async (req, res, next) => {
  const today = new Date().toISOString().split('T')[0];
  let quiz = await DailyQuiz.findOne({ date: today });

  if (!quiz) {
    // 🌟 السحر الجديد: سحب 5 أسئلة عشوائية من الأسئلة التي لم تُستخدم بعد
    let bankQuestions = await QuestionBank.aggregate([
      { $match: { lastUsed: null } }, // هات اللي متسألش خالص الأول
      { $sample: { size: 5 } }        // اختار منهم 5 بشكل عشوائي تماماً
    ]);

    // لو الأسئلة اللي متسألتش خلصت (بعد ما الـ 135 يخلصوا)
    // السيرفر هيجيب أقدم 50 سؤال اتسألوا من زمان، ويخلطهم ويختار 5 عشوائي!
    if (bankQuestions.length < 5) {
      bankQuestions = await QuestionBank.aggregate([
        { $sort: { lastUsed: 1 } },
        { $limit: 50 },
        { $sample: { size: 5 } }
      ]);
    }

    if (bankQuestions.length < 5) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'لا توجد أسئلة كافية في بنك الأسئلة' 
      });
    }

    // تجهيز الأسئلة للمسابقة
    const selectedQuestions = bankQuestions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    // حفظها كمسابقة اليوم
    quiz = await DailyQuiz.create({
      date: today,
      questions: selectedQuestions
    });

    // تحديث تاريخ الاستخدام عشان ميتسألوش تاني قريب
    const questionIds = bankQuestions.map(q => q._id);
    await QuestionBank.updateMany(
      { _id: { $in: questionIds } },
      { lastUsed: new Date() }
    );
  }

  res.status(200).json({ status: 'success', data: { quiz } });
});

// ─── 2. إضافة أسئلة جديدة للبنك (للأدمن فقط) ───
exports.addToBank = catchAsync(async (req, res, next) => {
  const questions = req.body.questions;
  
  if (!questions || questions.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'لم يتم إرسال أي أسئلة' });
  }

  // إدخال الأسئلة للبنك دفعة واحدة
  await QuestionBank.insertMany(questions);

  res.status(201).json({
    status: 'success',
    message: `تمت إضافة ${questions.length} أسئلة إلى بنك الأسئلة بنجاح 🚀`
  });
});


// ─── 3. إحصائيات البنك للأدمن ───
exports.getBankStats = catchAsync(async (req, res, next) => {
  const totalQuestions = await QuestionBank.countDocuments();
  const unusedQuestions = await QuestionBank.countDocuments({ lastUsed: null });
  
  res.status(200).json({
    status: 'success',
    data: {
      total: totalQuestions,
      unused: unusedQuestions
    }
  });
});

// ─── 4. جلب كل الأسئلة من البنك (للأدمن فقط) ───
exports.getAllBank = catchAsync(async (req, res, next) => {
  const questions = await QuestionBank.find().sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    data: { questions }
  });
});

// ─── 5. تعديل سؤال من البنك ───
exports.updateBankQuestion = catchAsync(async (req, res, next) => {
  const { question, options, correctAnswer, explanation } = req.body;
  const updated = await QuestionBank.findByIdAndUpdate(
    req.params.id,
    { question, options, correctAnswer, explanation },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ status: 'fail', message: 'السؤال مش موجود' });
  res.status(200).json({ status: 'success', data: { question: updated } });
});

// ─── 6. حذف سؤال من البنك ───
exports.deleteBankQuestion = catchAsync(async (req, res, next) => {
  const deleted = await QuestionBank.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ status: 'fail', message: 'السؤال مش موجود' });
  res.status(200).json({ status: 'success', message: 'تم حذف السؤال بنجاح' });
});