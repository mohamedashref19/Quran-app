const express = require("express")
const quranControllers = require("../controllers/quranControllers")
const authControllers = require("../controllers/authControllers")
const uploadControllers = require("../utils/uploadManager")

const router = express.Router()



router.post("/check-recitation",authControllers.proctect,uploadControllers.uploadRecitation,quranControllers.check_recitation)

module.exports = router
