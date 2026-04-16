const Radio = require("../models/Radio");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllStations = catchAsync(async (req, res, next) => {
  const stations = await Radio.find().sort({ order: 1 });
  res.status(200).json({ status: "success", data: { stations } });
});