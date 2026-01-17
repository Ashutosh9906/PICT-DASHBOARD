import { Router } from "express";
// import { handleListMessage, handleNewMail, handleEvents } from "../controller/message.js";
import { handlegetMessage, handleNewmail, handleGetSpecificMessage } from "../controller/messageController.js";
import { limiter } from "../middlewares/limiter.js";

const router = Router();

router.get("/", limiter, handlegetMessage);
router.post("/events", handleNewmail)
router.get("/getSpecificMessage", limiter, handleGetSpecificMessage)
// router.post("/newMail", handleNewMail);

export default router;