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
  formatDate,
  isCacheEmpty,
} from "../utilities/messages.js";
import Message from "../models/message.js";
import oAuth2Client from "../credentials.js";
import mongoose, { skipMiddlewareFunction } from "mongoose";
import User from "../models/users.js";

// Gmail client
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// ---------------------- Gmail Watch ----------------------
let watchTimeout = null;

async function startWatch() {
  try {
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: "projects/gmail-tracer/topics/gmail-notifications",
      },
    });

    await setLastHistoryId(res.data.historyId);
    console.log("Gmail watch started:", res.data);

    // Clear any existing timer
    if (watchTimeout) clearTimeout(watchTimeout);

    // Google gives expiration in ms (UNIX timestamp)
    const expirationTime = Number(res.data.expiration);

    // Refresh 1 minute before expiration
    const refreshIn = expirationTime - Date.now() - 60_000;

    console.log("Next refresh in (ms):", refreshIn);

    if (refreshIn > 0) {
      watchTimeout = setTimeout(() => {
        console.log("⏳ Refreshing Gmail watch before expiration...");
        startWatch();
      }, refreshIn);
    }
  } catch (error) {
    console.error("Error starting Gmail watch:", error);

    // Retry after 1 minute if watch call fails
    setTimeout(startWatch, 60_000);
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

        const email = process.env.USER_EMAIL
        const users = await User.findOne({ email })
        if (!users) throw new Error("users not found");
        let isEmail = false;
        let type;
        for (let allowed of users.allowedEmails) {
          const parts = from.split('<');
          const Email = parts[1] ? parts[1].split('>')[0] : parts[0];
          if (allowed == Email) {
            isEmail = true;
          }
        }

        if (isEmail) {
          await Message.create([{ msgId, subject: subject.toLowerCase(), from, date, body }], { session });
          cache.mails = [];
          cache.totalMessages = -1;
          console.log("printing empty cache\n", cache);
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
    if (error.message === "users not found") return res.status(404).json({ msg: "users with allowed users field not found" });

    console.error("Error handling new mail:", error);
    res.status(500).send("Error");
  }
}

// ---------------------- Handle Display Specific Message ----------------------
async function handleGetSpecificMessage(req, res) {
  try {

    const limit = 10;
    let page = parseInt(req.query.page) || 1;
    let type = req.query.type.toLowerCase();

    let offset = (page - 1) * limit;

    const totalMessages = await Message.countDocuments({ subject: type });
    const totalPages = Math.ceil(totalMessages / limit);

    const allMails = await Message.find({ subject: type })
      .select("subject from date body type -_id")
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    allMails.forEach(u => {
      u.body = formatBody(u.body);
      u.date = formatDate(u.date);
      u.subject = u.subject.toUpperCase();
    })

    // return res.status(200).json({ allMails });
    return res.render("subject-1", { allMails, type: type.toUpperCase(), totalPages, currentPage: page });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal Server Error" })
  }
}

let cache = {
  mails: [],
  totalMessages: -1
};

// ---------------------- Fetch top 10 messages manually ----------------------
async function handlegetMessage(req, res) {
  const limit = 10;
  let page = parseInt(req.query.page) || 1;
  let allMails, totalMessages

  let offset = (page - 1) * limit;

  if (!isCacheEmpty(cache)) {
    if (page === 1) {
      allMails = cache.mails;
      totalMessages = cache.totalMessages;
      // console.log("send cache\n", cache);
    } else {
      totalMessages = await Message.countDocuments();

      allMails = await Message.find()
        .select("subject from date body -_id")
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      for (let m of allMails) {
        m.body = formatBody(m.body);
        m.date = formatDate(m.date);
        m.subject = m.subject.toUpperCase();
      }
    }
  } else {
    totalMessages = await Message.countDocuments();
    allMails = await Message.find()
      .select("subject from date body -_id")
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    for (let m of allMails) {
      m.body = formatBody(m.body);
      m.date = formatDate(m.date);
      m.subject = m.subject.toUpperCase();
    }
    if (page === 1) {
      cache.mails = allMails;
      cache.totalMessages = totalMessages;
      // console.log("set cache\n", cache);
    }
  }
  const totalPages = Math.ceil(totalMessages / limit);
  return res.render("homepage", { allMails, totalPages, currentPage: page, totalMessages });
  // return res.status(200).json({ allMails });
}

export {
  handlegetMessage,
  handleNewmail,
  startWatch,
  handleGetSpecificMessage
}