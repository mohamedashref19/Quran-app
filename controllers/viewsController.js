const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

exports.getLoginForm = (req, res) => res.status(200).render('login', { title: 'تسجيل الدخول' });
exports.getSignupForm = (req, res) => res.status(200).render('signup', { title: 'حساب جديد' });
exports.getVerifyOTPForm = (req, res) => res.status(200).render('verifyOTP', { title: 'تأكيد الحساب' });

exports.getAccount = (req, res) => {
  res.status(200).render('me', {
    title: 'إعدادات الحساب',
    user: req.user 
  });
};

exports.manageUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).render('manageUsers', {
    title: 'إدارة المستخدمين',
    users
  });
});
exports.getOverview = (req, res) => {
  res.status(200).render('overview', { 
    title: 'الرئيسية'
  });
};

exports.getForgotPasswordForm = (req, res) => {
  res.status(200).render('forgotPassword', {
    title: 'نسيت كلمة المرور'
  });
};

exports.getResetPasswordForm = (req, res) => {
  res.status(200).render('resetPassword', {
    title: 'تعيين كلمة مرور جديدة',
    token: req.params.token 
  });
};


exports.getQuran = (req, res) => {
  res.status(200).render('quran', { title: 'المصحف الشريف' });
};

exports.getSurah = (req, res) => {
  res.status(200).render('surah', { 
    title: `سورة رقم ${req.params.number}`,
    surahNumber: req.params.number
  });
};

exports.getKhatmah = (req, res) => {
  res.status(200).render('khatmah', { title: 'الختمة' });
};

exports.getReciters = (req, res) => {
  res.status(200).render('reciters', { title: 'القراء' });
};

exports.getRecitationCheck = (req, res) => {
  res.status(200).render('recitation', { title: 'المصحح الآلي' });
};
exports.getAutomaticTracker = (req, res) => {
  res.status(200).render('live-recitation', { title: 'المتتبع الآلي' });
};

exports.getPrayers = (req, res) => {
  res.status(200).render('prayers', { title: 'مواقيت الصلاة' });
};

exports.getBookmarks = (req, res) => {
  res.status(200).render('bookmarks', { title: 'العلامات المحفوظة' });
};