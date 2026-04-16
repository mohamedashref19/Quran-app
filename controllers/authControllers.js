const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { promisify } = require("util");
const User = require("../models/User");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createandsentToken = (user, statuscode, res) => {
  const token = signToken(user._id);
  const cookieOpetions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOpetions.secure = true;
  res.cookie("jwt", token, cookieOpetions);
  user.password = undefined;
  res.status(statuscode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newuser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    verified: false,
  });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  newuser.otp = otp;
  newuser.otpExpires = Date.now() + 10 * 60 * 1000;
  await newuser.save({ validateBeforeSave: false });

  try {
    await new Email(newuser, "").sendOTP(otp);
    res.status(200).json({
      status: "success",
      message: "OTP sent to email",
      email: newuser.email,
    });
  } catch (err) {
    newuser.otp = undefined;
    newuser.otpExpires = undefined;
    await newuser.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
  // const url = `${req.protocol}://${req.get("host")}/me`;
  // await new Email(newuser, url).sendWelcome();
  // createandsentToken(newuser, 201, res);
});
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp,
    otpExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("رمز التحقق لمرة واحدة أو الرمز المميز غير صالح وقد انتهت صلاحيته!", 400));
  }
  user.verified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });
  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(user, url).sendWelcome();
  createandsentToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("يرجى تقديم البريد الإلكتروني أو كلمة المرور", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new AppError("البريد الإلكتروني أو كلمة المرور خاطئة", 401));
  }
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("البريد الإلكتروني أو كلمة المرور خاطئة", 401));
  }
  if (!user.verified) {
    return res.status(403).json({
      status: "fail",
      message: "حسابك غير مفعل، يرجى إدخال كود التحقق.",
      actionRequired: "VERIFY_OTP", 
      email: user.email 
    });
  }

  createandsentToken(user, 200, res);
});

exports.resendOTP = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("يرجى توفير البريد الإلكتروني", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("لا يوجد مستخدم بهذا البريد الإلكتروني", 404));
  }

  if (user.verified) {
    return res.status(400).json({
      status: "fail",
      message: "هذا الحساب مفعل بالفعل، يمكنك تسجيل الدخول."
    });
  }

  // ١. توليد OTP مكون من 6 أرقام
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // ٢. حفظ الكود في قاعدة البيانات
  user.otp = otp; 
  user.otpExpires = Date.now() + 10 * 60 * 1000; 
  await user.save({ validateBeforeSave: false });

  // ٣. إرسال الكود عبر الإيميل
  try {
    // 🌟 تم التعديل هنا: استخدام sendOTP الموجودة في كلاس Email
    await new Email(user, "").sendOTP(otp);
    
    res.status(200).json({
      status: "success",
      message: "تم إرسال كود تحقق جديد إلى بريدك الإلكتروني",
      email: user.email,
    });
  } catch (err) {
    console.error("--- 📧 EMAIL SENDING FAILED! ---", err);
    
    // تصفير البيانات في حال فشل الإرسال حتى لا يبقى كود وهمي في الداتابيز
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(new AppError("حدث خطأ في الخادم أثناء إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً", 500));
  }
});
exports.proctect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token || token === "logout") {
    if (!req.originalUrl.startsWith('/api')) {
        return res.redirect('/login');
    }
    return next(new AppError('أنت غير مسجل الدخول! يرجى تسجيل الدخول للوصول.', 401));
  }
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentuser = await User.findById(decode.id);
  if (!currentuser) {
    return next(
      new AppError("user is belogging token is deleted and not exsits", 401)
    );
  }
  if (currentuser.changepassword(decode.iat)) {
    return next(
      new AppError("تم تغيير كلمة المرور مؤخراً. الرجاء تسجيل الدخول مجدداً.", 401)
    );
  }
  req.user = currentuser;
  res.locals.user = currentuser;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
 
  if (req.cookies.jwt&&req.cookies.jwt !== 'loggedout') {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      if (currentUser.changepassword(decoded.iat)) {
        return next();
      }
      res.locals.user = currentUser;
      req.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.restrictTO =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("You are not logged in to access this feature.", 401)
      );
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("you do not have permission to do this action", 403)
      );
    }
    next();
  };

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("كلمة مرورك الحالية غير صحيحة", 401));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  createandsentToken(user, 200, res);
});

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("عنوان البريد الإلكتروني المُدخل غير مسجل.", 404));
  }

  // توليد OTP مكون من 6 أرقام
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOTP = otp;
  user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000; 
  await user.save({ validateBeforeSave: false });

  try {
    await new Email(user, "").sendPasswordResetOTP(otp);
    res.status(200).json({
      status: "success",
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (err) {
    console.error("--- 📧 EMAIL SENDING FAILED! ---", err);
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("some thing is error on server", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password, passwordConfirm } = req.body;

  const user = await User.findOne({
    email,
    passwordResetOTP: otp,
    passwordResetOTPExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("رمز التحقق لمرة واحدة غير صالح أو منتهي الصلاحية", 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpires = undefined;
  await user.save();

  createandsentToken(user, 200, res);
});


exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    // 1. Bearer token (موبايل / axios)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Cookie (ويب)
    else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
      token = req.cookies.jwt;
    }

    if (!token) return next();

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser || currentUser.changepassword(decoded.iat)) return next();

    req.user = currentUser;
    res.locals.user = currentUser;
    return next();
  } catch (err) {
    return next();
  }
};