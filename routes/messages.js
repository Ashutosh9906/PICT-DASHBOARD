import { Router } from "express";
// import { handleListMessage, handleNewMail, handleEvents } from "../controller/message.js";
import { handlegetMessage, handleNewmail, handleGetSpecificMessage } from "../controller/messageController.js";


const router = Router();

router.get("/", handlegetMessage);
router.post("/events", handleNewmail)
router.get("/getSpecificMessage", handleGetSpecificMessage)
// router.post("/newMail", handleNewMail);

export default router;