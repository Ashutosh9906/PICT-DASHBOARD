// const { google } = require("googleapis");
// const fs = require("fs");
// const path = require("path");

// const oAuth2Client = require("../credentials");
// const { getMessage, parseMessage } = require("../utilities/messages")
// const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
// const Message = require("../models/message");
// let lastHistoryId = null;
// let clients = [];

// function handleEvents(req, res) {
//     try {
//         res.setHeader("Content-Type", "text/event-stream");
//         res.setHeader("Cache-Control", "no-cache");
//         res.setHeader("Connection", "keep-alive");
//         res.flushHeaders();

//         const clientId = Date.now();
//         const newClient = {
//             id: clientId,
//             res
//         };
//         clients.push(newClient);

//         req.on("close", () => {
//             console.log(`${clientId}, Connection Closed`);
//             clients = clients.filter(client => client.id !== clientId);
//         })
//     } catch (error) {
//         console.log("Error", error);
//         return res.status(400).json({ err: "Internal Server Error" })
//     }
// }

// function sendEventsToAll(newEmail) {
//     clients.forEach(client =>
//         client.res.write(`data: ${JSON.stringify(newEmail)}\n\n`)
//     );
// }

// const TOKEN_PATH = path.join(__dirname, "../json/token.json");
// if (fs.existsSync(TOKEN_PATH)) {
//     const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
//     oAuth2Client.setCredentials(tokens);
// }

// async function handleNewMail(req, res) {
//     const message = Buffer.from(req.body.message.data, "base64").toString("utf8")
//     const data = JSON.parse(message);
//     console.log("New Gmail Notification", data);
    
//     try {
//         if (lastHistoryId) {
//             const historyResponse = await gmail.users.history.list({
//                 userId: "me",
//                 startHistoryId: lastHistoryId,
//                 historyTypes: ["messageAdded"], // only get new emails
//             });

//             if (historyResponse.data.history) {
//                 for (const history of historyResponse.data.history) {
//                     for (const m of history.messages || []) {
//                         if (!await Message.exists({ gmailId: m.id })) {
//                             const fullMessage = await getMessage(m.id);
//                             const parsed = parseMessage(fullMessage);
//                             parsed.body = parsed.body.replace(/\s+/g, " ").trim();

//                             const { subject, from, date, body } = parsed;
//                             console.log("NEW EMAIL:", parsed);

//                             const newEmail = await Message.create({
//                                 gmailId: m.id,
//                                 subject,
//                                 from,
//                                 date,
//                                 body
//                             });
//                             sendEventsToAll(newEmail);
//                         }
//                     }
//                 }
//             }
//         }

//         lastHistoryId = data.historyId;

//     } catch (error) {
//         if (error.code === 404) {
//             console.log("History expired, doing full sync...");
//             const messagesList = await gmail.users.messages.list({
//                 userId: "me",
//                 labelIds: ["INBOX"],
//                 maxResults: 10
//             });

//             for (const m of messagesList.data.messages || []) {
//                 if (!await Message.exists({ gmailId: m.id })) {
//                     const fullMessage = await getMessage(m.id);
//                     const parsed = parseMessage(fullMessage);
//                     parsed.body = parsed.body.replace(/\s+/g, " ").trim();
//                     await Message.create({
//                         gmailId: m.id, // 👈 unique Gmail ID
//                         subject: parsed.subject,
//                         from: parsed.from,
//                         date: parsed.date,
//                         body: parsed.body
//                     });
//                 }
//             }

//             lastHistoryId = data.historyId; // reset sync point
//             return;
//         }
//     }
//     res.status(200).send("OK");
// }

// async function handleListMessage(req, res) {
//     try {
//         const messages = await Message.find();
//         // console.log(messages);
//         return res.render("homepage", { messages });
//     } catch (error) {
//         console.log("Error", error);
//         return res.status(400).json({ err: "Internal Server Error" })
//     }
// }

// module.exports = {
//     handleListMessage,
//     handleNewMail,
//     handleEvents
// }

import fs from "fs"
import {google} from "googleapis";
import { PubSub } from "@google-cloud/pubsub";

//custom requires
import { getTop10Messages, cleanBody, fetchMailById, getLastHistoryId, setLastHistoryId } from "../utilities/messages.js";
import Message from "../models/message.js";
import oAuth2Client from "../credentials.js";

//load credentials 
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
const pubsub = new PubSub({ projectId: 	"gmail-tracer" });
const subscriptionName  = "gmail-notifications-sub";
// let lastHistoryId = await getLastHistoryId(); 

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

async function handleNewmail(req, res) {
    const subscription = pubsub.subscription(subscriptionName);

    subscription.on("message", async (msg) => {
        try {
            // 1️⃣ decode Pub/Sub message
            const pubSubMessage = req.body.message;
            const data = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString());
            console.log('📩 Pub/Sub message received:', data);

            const historyId = data.historyId;
            const lastHistory = await getLastHistoryId();

            // 2️⃣ fetch Gmail history since lastHistoryId
            const historyRes = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: lastHistory || historyId,
                historyTypes: ['messageAdded']
            });

            const histories = historyRes.data.history || [];

            // 3️⃣ process messages
            for (const h of histories) {
                for (const m of h.messages || []) {
                    const { subject, from, date, body } = await fetchMailById(m.id);
                    const exists = await Message.findOne({ msgId: m.id });
                    if (!exists) {
                        await Message.create({ msgId: m.id, subject, from, date, body });
                        console.log('Inserted new email:', m.id);
                    }
                }
            }

            // 4️⃣ update lastHistoryId in DB
            await setLastHistoryId(historyId);

            // 5️⃣ acknowledge Pub/Sub
            res.status(200).send('OK');
        } catch (err) {
            console.error('Error handling new mail:', err);
            res.status(500).send('Error');
        }
    })
}

async function startWatch() {
    try {
        const response = await gmail.users.watch({
            userId: "me",
            requestBody: {
                labelIds: ["INBOX"],
                topicName: "projects/gmail-tracer/topics/gmail-notifications"
            }
        });

        // lastHistoryId = response.data.historyId;
        return console.log("Watch Response", response.data);
    } catch (error) {
        console.log("Error", error);
        throw error;
    }
}


export { handlegetMessage, handleNewmail, startWatch };

