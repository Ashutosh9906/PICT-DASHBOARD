const { Router } = require("express");
const { handleAuthentication, handleVerifyEmail } = require("../controller/authenticate");

const router = Router();

router.get("/auth", handleAuthentication);
router.get("/oauth2callback", handleVerifyEmail);

module.exports = router;