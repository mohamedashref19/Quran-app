require("dotenv").config()
const express=require("express")
const path = require("path")

const cors=require("cors")
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const compression = require("compression");
const helmet = require("helmet");
const { filterXSS } = require("xss");
const authRouter = require("./routes/authRoutes")
const quranRouter = require("./routes/quranRoutes")
const readingRoutes = require("./routes/readingRoutes")
const bookmarkRoutes = require("./routes/bookmarkRoutes")
const audioRoutes = require("./routes/audioRoutes")
const khatmahRoutes = require("./routes/khatmahRoutes")
const prayerRoutes = require("./routes/prayerRoutes")
const viewRoutes = require("./routes/viewRoutes")
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorControllers");

const app = express();
app.set("trust proxy", 1);

// 1. Security Middleware (Helmet)


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "data:", "blob:", "https:", "ws:"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'", "https:", "data:", "blob:"],
        scriptSrc: [
          "'self'",
          "https:",
          "http:",
          "blob:", 
          "https://*.mapbox.com",
          "https://js.stripe.com",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        workerSrc: ["'self'", "data:", "blob:"],
        childSrc: ["blob:"], 
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://i.imgur.com",
          "https://www.transparenttextures.com",
        ],
        connectSrc: [
          "'self'",
          "data:",
          "blob:",
          "ws://127.0.0.1:*/",
          "http://127.0.0.1:3000", 
          "https://cdn.jsdelivr.net",
          "https://nominatim.openstreetmap.org",
          "https://cdnjs.cloudflare.com",
          "https://www.transparenttextures.com"
          
        ],
      },
    },
  })
);

// 2. Logging (Development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));



// 3. Body Parser & Cookie Parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// 4. CORS
app.use(cors());

// 5. Rate Limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);



app.use((req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return filterXSS(value);
    }
    if (value && typeof value === 'object') {
      Object.keys(value).forEach((key) => {
        const safeKey = key.replace(/\$|\./g, '');
        if (safeKey !== key) {
          value[safeKey] = value[key];
          delete value[key];
        }
        value[safeKey] = sanitizeValue(value[safeKey]);
      });
    }
    return value;
  };

  req.body = sanitizeValue(req.body);
  req.params = sanitizeValue(req.params);
  req.query = sanitizeValue(req.query);
  next();
});


// 7. Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      "surahNumber",
      "ayahNumber",
      "lat",
      "lng",
      "method",
      "durationDays",
      "rewaya"
    ],
  })
);

app.use(compression());

// 8. Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 9. ROUTES
app.use("/", viewRoutes);
app.use("/api/v1/users", authRouter);
app.use("/api/v1/quran", quranRouter); 
app.use("/api/v1/quran", readingRoutes); 
app.use("/api/v1/bookmarks", bookmarkRoutes); 
app.use("/api/v1/audio", audioRoutes); 
app.use("/api/v1/khatmah", khatmahRoutes); 
app.use("/api/v1/prayers", prayerRoutes); 

// 10. Handle Unhandled Routes
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 11. Global Error Handler
app.use(globalErrorHandler);

module.exports = app;



