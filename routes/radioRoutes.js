const express = require("express")
const radioController= require("../controllers/radioController")
const router = express.Router();


router.get("/", radioController.getAllStations);


module.exports = router;