const express = require("express")
const userControllers= require("../controllers/userControllers")
const authControllers= require("../controllers/authControllers")

const router = express.Router();
router.get("/Allusers", userControllers.getAlluser);
router.post("/signup", authControllers.signup);
router.post("/verifyOTP", authControllers.verifyOTP);
router.post("/login", authControllers.login);
router.get("/logout", authControllers.logout);
router.post("/forgetPassword", authControllers.forgetPassword);
router.patch("/resetPassword/:token", authControllers.resetPassword);

router.use(authControllers.proctect);
router.get("/me", userControllers.getMe);
router.patch(
  "/updateMe",
  
  userControllers.updateMe
);
router.delete("/deleteMe",  userControllers.deleteMe);
router.patch(
  "/updatePassword",
  
  authControllers.updatePassword
);

router.use(authControllers.restrictTO('admin'));

router.route('/').get(userControllers.Allusers).post(userControllers.CreateUser);
router
  .route('/:id')
  .get(userControllers.getUser)
  .patch(userControllers.UpdateUser)
  .delete(userControllers.DeleteUser);

module.exports = router;