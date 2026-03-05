const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const factory  = require("./handlerFactory")

const filterobj = (obj, ...allowed) => {
  let newobj = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) newobj[el] = obj[el];
  });
  return newobj;
};

exports.getAlluser = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: "success",
    result: users.length,
    data: {
      user: users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const filterBody = filterobj(req.body, "name", "email");
  if (req.file) filterBody.photo = req.file.filename;

  const updateUser = await User.findByIdAndUpdate(req.user, filterBody, {
    // new: true,
     returnDocument: 'after',
    runValidators: true,
  });
  res.status(200).json({
    status: "success",
    data: {
      user: updateUser,
    },
  });
});



exports.getMe = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      doc: req.user
    }
  });
};
exports.Allusers = factory.getAll(User);
exports.getUser = factory.getone(User);
exports.UpdateUser = factory.updateone(User);
exports.DeleteUser = factory.deleteone(User);
exports.CreateUser = factory.createone(User);

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    status: 'success',
    message: 'تم حذف الحساب بنجاح.'
  });
});