const { Router } = require("express");
const { handleAuthentication } = require("../controller/authenticate");

const router = Router();

router.get("/", handleAuthentication)

module.exports = router;