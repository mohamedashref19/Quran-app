const DailyQuiz = require('../models/DailyQuiz');
const Leaderboard = require('../models/leaderboardModel');
const QuestionBank = require('../models/QuestionBank');
const catchAsync = require('../utils/catchAsync');

exports.getTodayQuiz = catchAsync(async (req, res, next) => {
   const tz = req.query.tz || 'UTC';
  
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });

  let quiz = await DailyQuiz.findOne({ date: today });

  if (!quiz) {
    let bankQuestions = await QuestionBank.aggregate([
      { $match: { lastUsed: null } }, 
      { $sample: { size: 5 } }        
    ]);


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

    const selectedQuestions = bankQuestions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    quiz = await DailyQuiz.create({
      date: today,
      questions: selectedQuestions
    });

    const questionIds = bankQuestions.map(q => q._id);
    await QuestionBank.updateMany(
      { _id: { $in: questionIds } },
      { lastUsed: new Date() }
    );
  }

  res.status(200).json({ status: 'success', data: { quiz } });
});


exports.addToBank = catchAsync(async (req, res, next) => {
  const questions = req.body.questions;
  
  if (!questions || questions.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'لم يتم إرسال أي أسئلة' });
  }

  await QuestionBank.insertMany(questions);

  res.status(201).json({
    status: 'success',
    message: `تمت إضافة ${questions.length} أسئلة إلى بنك الأسئلة بنجاح 🚀`
  });
});


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

exports.getAllBank = catchAsync(async (req, res, next) => {
  const questions = await QuestionBank.find().sort({ createdAt: -1 });
  res.status(200).json({
    status: 'success',
    data: { questions }
  });
});

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

exports.deleteBankQuestion = catchAsync(async (req, res, next) => {
  const deleted = await QuestionBank.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ status: 'fail', message: 'السؤال مش موجود' });
  res.status(200).json({ status: 'success', message: 'تم حذف السؤال بنجاح' });
});

exports.submitScore = catchAsync(async (req, res, next) => {
  const { name, score, total, date } = req.body;

  if (!name || score === undefined || !total || !date) {
    return next(new AppError('بيانات غير مكتملة', 400));
  }

  const newEntry = await Leaderboard.create({
    name,
    score,
    total,
    date
  });

  res.status(201).json({
    status: 'success',
    data: {
      entry: newEntry
    }
  });
});

exports.getDailyLeaderboard = catchAsync(async (req, res, next) => {
  const { date, tz } = req.query; 
  const userTimeZone = tz || 'Africa/Cairo';

  if (!date) {
    return next(new AppError('يرجى تحديد التاريخ', 400));
  }

  const leaders = await Leaderboard.find({ date })
    .sort({ score: -1, createdAt: 1 })
    .limit(10)
    .select('name score total createdAt -_id'); 

  const formattedLeaders = leaders.map(leader => {
    return {
      name: leader.name,
      score: leader.score,
      total: leader.total,
      time: leader.createdAt.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: userTimeZone 
      })
    };
  });

  res.status(200).json({
    status: 'success',
    results: formattedLeaders.length,
    data: {
      leaders: formattedLeaders
    }
  });
});