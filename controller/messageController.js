// messageController.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

// Utilities & models
import {
  fetchMailById,
  cleanBody,
  getLastHistoryId,
  setLastHistoryId,
} from "../utilities/messages.js";
import Message from "../models/message.js";
import oAuth2Client from "../credentials.js";

// Gmail client
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// ---------------------- Gmail Watch ----------------------
async function startWatch() {
  try {
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: "projects/gmail-tracer/topics/gmail-notifications", // your Pub/Sub topic
      },
    });

    await setLastHistoryId(res.data.historyId);
    console.log("Gmail watch started:", res.data);
  } catch (error) {
    console.error("Error starting Gmail watch:", error);
  }
}

// ---------------------- Handle new mail via push ----------------------
async function handleNewmail(req, res) {
  try {
    // Gmail sends a push message with JSON body
    const message = req.body;

    if (!message || !message.message || !message.message.data) {
      console.log("Invalid Pub/Sub message:", message);
      return res.status(400).send("Invalid message");
    }

    // Decode base64 Pub/Sub message
    const pubsubMessage = Buffer.from(message.message.data, "base64").toString("utf-8");
    let data;
    try {
      data = JSON.parse(pubsubMessage); // Gmail should send JSON with historyId
    } catch (err) {
      console.log("Pub/Sub message not JSON:", pubsubMessage);
      return res.status(200).send("OK"); // ack even if not JSON
    }

    const historyId = data.historyId;
    if (!historyId) return res.status(200).send("OK");

    // Get last processed historyId from DB
    const lastId = await getLastHistoryId();

    // Fetch Gmail history
    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: lastId || historyId,
      historyTypes: ["messageAdded"],
    });

    const histories = historyRes.data.history || [];

    for (const h of histories) {
      if (!h.messagesAdded) continue;

      for (const m of h.messagesAdded) {
        const msgId = m.message.id;

        const exists = await Message.findOne({ msgId });
        if (exists) continue;

        const { subject, from, date, body } = await fetchMailById(msgId);

        await Message.create({ msgId, subject, from, date, body });
        console.log("Inserted new email:", msgId);
      }
    }

    // Update lastHistoryId in DB
    await setLastHistoryId(historyId);

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error handling new mail:", error);
    res.status(500).send("Error");
  }
}

// ---------------------- Fetch top 10 messages manually ----------------------
async function handlegetMessage(req, res) {
    // const body = await getTop10Messages();
    // for (let mail of body) {
    //     mail.body = cleanBody(mail.body);
    //     const ismail = await Message.findOne({ msgId: mail.msgId });
    //     if(!ismail){
    //         newEmail = await Message.create({
    //             msgId: mail.msgId,
    //             subject: mail.subject || "",
    //             from: mail.from,
    //             date: mail.date || "",
    //             body: mail.body
    //         });
    //         console.log(newEmail);
    //     } 
    // }
    const allMails = await Message.find().sort({ createdAt: -1 });
    return res.json({ msg: "Messages fetched successfully" ,allMails});
}

export {
    handlegetMessage,
    handleNewmail,
    startWatch
}