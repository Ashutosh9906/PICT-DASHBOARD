import { Router } from "express";
// import { handleListMessage, handleNewMail, handleEvents } from "../controller/message.js";
import { handlegetMessage, handleNewmail } from "../controller/messageController.js";


const router = Router();

router.get("/", handlegetMessage);
router.post("/events", handleNewmail)
// router.post("/newMail", handleNewMail);

export default router;