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
// 4. CORS
app.use(cors({
  origin: [
    'http://127.0.0.1:3000', 
    'http://localhost:3000', 
    'capacitor://localhost', 
    'http://localhost',
    'https://aqraapp.com',
    'https://www.aqraapp.com'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 1. Security Middleware (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"], 
        scriptSrcAttr: ["'unsafe-inline'"],
        
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://js-de.sentry-cdn.com",
          "https://browser.sentry-cdn.com",
          "https://www.gstatic.com",
          "https://www.googletagmanager.com",
          "https://static.cloudflareinsights.com", // سكريبت كلاود فلير
          "capacitor://localhost",
          "http://localhost"
        ],
        
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com"
        ],
        
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "data:"
        ],
        
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "capacitor://localhost",
          "http://localhost",
          "https:",
          "https://*.googleusercontent.com",
          "https://www.transparenttextures.com",
          "https://ui-avatars.com"
        ],
        
        mediaSrc: [
          "'self'", 
          "https:", 
          "data:", 
          "blob:",
          "https://*.mp3quran.net",
          "https://everyayah.com",        
          "https://archive.org",          
          "https://*.archive.org"
        ], 
        
        connectSrc: [
          "'self'",
          "https://aqraapp.com", // الدومين الجديد
          "https://www.aqraapp.com",
          "https://www.transparenttextures.com",
          "https://*.googleusercontent.com",
          "https://api.alquran.cloud",
          "https://*.mp3quran.net",
          "https://server12.mp3quran.net",
          "https://server8.mp3quran.net",
          "https://server11.mp3quran.net",
          "https://js-de.sentry-cdn.com",
          "https://www.googletagmanager.com",
          "https://cdn.jsdelivr.net",
          "https://*.sentry.io",
          "https://firebase.googleapis.com",
          "https://firebaseinstallations.googleapis.com",
          "https://*.google-analytics.com",
          "https://www.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://everyayah.com",
          "https://archive.org",         
          "https://*.archive.org",        
          "https://fonts.googleapis.com", 
          "https://fonts.gstatic.com",    
          "capacitor://localhost",
          "http://localhost",
          "ws://127.0.0.1:*", 
          "http://127.0.0.1:3000"
        ],
        
        workerSrc: ["'self'", "blob:"], 
        childSrc: ["blob:"],
        frameSrc: ["'none'"],   
        objectSrc: ["'none'"],
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

// 5. Rate Limiting
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// 6. XSS Sanitization
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
  
  const ignoredPaths = [
    '/icons/icon-48.webp',
    '/icons/icon-192.webp',
    '/icons/icon-256.webp',
    '/bundle.js.map',
    '/.well-known/appspecific/com.chrome.devtools.json',
    '/manifest.json',
    '/service-worker.js',
    '/offline.html'
  ];

  if (ignoredPaths.includes(req.originalUrl)) {
    return res.status(404).json({ status: 'fail', message: 'Not found' });
  }

  if (req.originalUrl.startsWith('/api/')) {
    return next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 11. Global Error Handler
app.use(globalErrorHandler);

module.exports = app;