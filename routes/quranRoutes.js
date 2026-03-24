const express = require("express")
const rateLimit = require("express-rate-limit");
const quranControllers = require("../controllers/quranControllers")
const authControllers = require("../controllers/authControllers")
const uploadControllers = require("../utils/uploadManager")

const router = express.Router()

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 15,  
  message: { status: 'fail', message: 'لقد وصلت للحد الأقصى من محاولات المصحح الذكي لهذه الساعة. يرجى أخذ استراحة ⏳' },
  handler: (req, res, next, options) => res.status(429).json(options.message)
});

const streamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 600, 
  message: { status: 'fail', message: 'تجاوزت الحد المسموح للتلاوة المباشرة لهذه الساعة، جرب المصحح العادي أو عد لاحقاً ⏳' },
  handler: (req, res, next, options) => res.status(429).json(options.message)
});

router.post("/check-recitation",authControllers.proctect,aiLimiter,uploadControllers.uploadRecitationLocal,quranControllers.check_recitation)
router.post(
  "/stream-check",
  authControllers.proctect,
  streamLimiter,
  uploadControllers.uploadRecitationLocal, 
  quranControllers.stream_check 
);
router.get("/ayahs", authControllers.proctect, quranControllers.getAyahs);
router.get("/my-recitations", authControllers.proctect, quranControllers.getMyRecitations);

module.exports = router
