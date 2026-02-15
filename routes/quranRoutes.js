const express = require("express")
const multer=require("multer")
const quranControllers = require("../controllers/quranControllers")
const authControllers = require("../controllers/authControllers")


const router = express.Router()

const upload= multer({dest:"public/audio/uploads/"})

router.post("/check-recitation",authControllers.proctect, upload.single("audio"),quranControllers.check_recitation)

module.exports = router
