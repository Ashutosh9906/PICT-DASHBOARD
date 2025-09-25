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
  formatBody,
} from "../utilities/messages.js";
import Message from "../models/message.js";
import oAuth2Client from "../credentials.js";
import mongoose from "mongoose";
import User from "../models/users.js";

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
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const message = req.body;

    if (!message || !message.message || !message.message.data) {
      throw new Error("Invalid message");
    }

    const pubsubMessage = Buffer.from(message.message.data, "base64").toString("utf-8");
    let data;
    try {
      data = JSON.parse(pubsubMessage);
    } catch (err) {
      throw new Error("OK");
    }

    const historyId = data.historyId;
    if (!historyId) throw new Error("OK");

    const lastId = await getLastHistoryId({ session }); // pass session

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

        const exists = await Message.findOne({ msgId }).session(session);
        if (exists) continue;
        const { subject, from, date, body } = await fetchMailById(msgId);

        const id = "68d540610262edc9c3bca11b"
        const users = await User.findById(id)
        if(!users) throw new Error("users not found");
        let isEmail = false;
        for(let email of users.allowedEmails){
          if(email == from){
            isEmail = true;
          }
        }

        if(isEmail){
          await Message.create([{ msgId, subject, from, date, body }], { session });
          console.log("Inserted new email:", msgId);
        } else {
          console.log("Didn't insert the email: ", msgId);
        }

      }
    }

    await setLastHistoryId(historyId, { session }); // pass session

    await session.commitTransaction();
    session.endSession();

    res.status(200).send("OK");

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.message === "OK") return res.status(200).send("OK");
    if (error.message === "Invalid message") return res.status(400).send("Invalid message");
    if(error.message === "users not found") return res.status(404).json({ msg: "users with allowed users field not found" });

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
  for (let m of allMails) {
    m.body = formatBody(m.body);
  }
  return res.render("homepage", { allMails });
}

export {
  handlegetMessage,
  handleNewmail,
  startWatch
}