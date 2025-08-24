const { Router } = require("express");
const { handleListMessage, handleNewMail } = require("../controller/message")

const router = Router();

router.get("/", handleListMessage);
router.post("/newMail", handleNewMail);

module.exports = router;