const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteone = Model =>
  catchAsync(async (req, res, next) => {
    //const id = req.params.id * 1;
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError(`this ${Model.modelName} id not found`, 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateone = Model =>
  catchAsync(async (req, res, next) => {
    //const id = req.params.id * 1;

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      //new: true,
      returnDocument: 'after',
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError(`this ${Model.modelName} id not found`, 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });
exports.createone = Model =>
  catchAsync(async (req, res, next) => {
    // const newtour=new Tour({})
    // newtour.save()
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getone = (Model, popOpetions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOpetions) query = query.populate(popOpetions);
    // const doc = await Model.findById(req.params.id).populate('reviews');
    //const tour= findone({_id:req.params.id})
    const doc = await query;
    if (!doc) {
      return next(new AppError(`this ${Model.modelName} id not found`, 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    let fillter = {} || req.filter;
    if (req.params.tourId) fillter = { tour: req.params.tourId };
    //Execute Query
    const features = new APIFeatures(Model.find(fillter), req.query)
      .filter()
      .sort()
      .limitfields()
      .Pagination();
    // const doc = await features.query.explain('executionStats');
    const doc = await features.query;
    //const tours = await Tour.find(req.query); //Modren Mongoose not need filter
    // send Respone
    res.status(200).json({
      status: 'success',
      result: doc.length,
      data: {
        data: doc,
      },
    });
  });
