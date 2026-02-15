const express = require("express")
const bookmarkControllers= require("../controllers/bookmarkControllers")
const authControllers= require("../controllers/authControllers")

const router = express.Router();
router.use(authControllers.proctect)


router.route("/").get(bookmarkControllers.getMyBookmarks)
.post(bookmarkControllers.toggleBookmark)

router.route("/:id").delete(bookmarkControllers.deleteBookemark)

module.exports=router