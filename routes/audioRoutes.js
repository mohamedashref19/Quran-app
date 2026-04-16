const express = require("express")
const audioControllers= require("../controllers/audioControllers")
const router = express.Router();


router.get("/reciters", audioControllers.getAllReciters);
router.get("/livetv", audioControllers.getLiveStreams);
router.get("/stream/:reciterId/:surahNumber", audioControllers.getStreamUrl);

module.exports = router;