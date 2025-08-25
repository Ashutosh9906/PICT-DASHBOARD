const { Router } = require("express");
const { handleListMessage, handleNewMail, handleEvents } = require("../controller/message")

const router = Router();

router.get("/", handleListMessage);
router.get("/events", handleEvents)
router.post("/newMail", handleNewMail);

module.exports = router;