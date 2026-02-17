const express = require("express")
const quranControllers = require("../controllers/quranControllers")
const authControllers = require("../controllers/authControllers")
const uploadControllers = require("../utils/uploadManager")

const router = express.Router()



router.post("/check-recitation",authControllers.proctect,uploadControllers.uploadRecitationLocal,quranControllers.check_recitation)
router.post(
  "/stream-check",
  authControllers.proctect,
  uploadControllers.uploadRecitationLocal, 
  quranControllers.stream_check 
);
router.get("/ayahs", authControllers.proctect, quranControllers.getAyahs);

module.exports = router
