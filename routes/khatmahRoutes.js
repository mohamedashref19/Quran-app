const express = require("express");
const authController = require("../controllers/authControllers");
const khatmahController = require("../controllers/khatmahController");

const router = express.Router();

router.use(authController.proctect);

router
  .route("/")
  .get(khatmahController.getCurrentKhatmah) 
  .post(khatmahController.createKhatmah)    
  .patch(khatmahController.updateProgress)  
  .delete(khatmahController.deleteKhatmah); 

module.exports = router;