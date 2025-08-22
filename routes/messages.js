const { Router } = require("express");
const { handleListMessage } = require("../controller/message")

const router = Router();

router.get("/", handleListMessage);

module.exports = router;