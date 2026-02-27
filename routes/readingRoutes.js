const express= require("express")
const readingControllers= require("../controllers/readingControllers")
const authControllers= require("../controllers/authControllers")

const router = express.Router()

router.get("/surahs", readingControllers.getAllSurah);
router.get("/search", readingControllers.search);
router.get('/continue', authControllers.isLoggedIn, readingControllers.continueKhatmah);
router.get("/tafseer/:surah", readingControllers.getTafseerBySurah);
router.get("/surah/:number", readingControllers.getSurah);
router.get("/tafseer/:surah/:ayah", readingControllers.getTafser);
router.get("/page/:page", authControllers.isLoggedIn,readingControllers.getPage);

module.exports= router