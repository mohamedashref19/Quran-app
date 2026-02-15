const AppError = require("./../utils/appError");

const handleErrorCastDB = (err) => {
  const message = `invaild ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

const handledubllicateDB = (err) => {
  const value = err.keyValue ? Object.values(err.keyValue)[0] : "";
  const message = `you must not dublicate ${value} use antoher name`;
  return new AppError(message, 400);
};
const handleValidatorErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `invaild data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};
const handleJWTError = () => new AppError("invaild Token please login in", 401);
const handleExpiredError = () =>
  new AppError("your Token it expired please log in again ", 401);

const senderrdev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }
  //Render website
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Some went Wrong",
    msg: err.message,
  });
};

const senderrprod = (err, req, res) => {
  //console.log('💥 senderrprod called with:', err);
  //Api
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: dont leak error details
    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "some thing is error",
    });
  }
  //Render Website
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Some went Wrong",
      msg: err.message,
    });
  }
  // Programming or other unknown error: dont leak error details
  //log error
  console.error("ERROR 💥", err);
  //generic error
  return res.status(err.statusCode).render("error", {
    title: "Some went Wrong",
    msg: "some thing is error",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  const env = process.env.NODE_ENV.trim();
  if (env === "development") {
    senderrdev(err, req, res);
  } else if (env === "production") {
    let error = {
      ...err,
      name: err.name ?? "Error",
      message: err.message ?? "Something went wrong!",
      code: err.code ?? 500,
      errmsg: err.errmsg ?? err.message ?? "",
    };

    if (error.name === "CastError") error = handleErrorCastDB(error);
    if (error.code === 11000) error = handledubllicateDB(error);
    if (error.name === "ValidationError") error = handleValidatorErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleExpiredError();

    senderrprod(error, req, res);
  }
};
