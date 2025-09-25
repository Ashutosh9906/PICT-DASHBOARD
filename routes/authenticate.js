import { Router } from "express";
import { handleAuthentication, handleVerifyEmail } from "../controller/authenticate.js";

const router = Router();

router.get("/auth", handleAuthentication);
router.get("/oauth2callback", handleVerifyEmail);

export default router;