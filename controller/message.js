const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const oAuth2Client = require("../credentials");
const { getMessage, parseMessage } = require("../utilities/messages")
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
const Message = require("../models/message");
let lastHistoryId = null;
let clients = [];

function handleEvents(req, res) {
    try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const clientId = Date.now();
        const newClient = {
            id: clientId,
            res
        };
        clients.push(newClient);

        req.on("close", () => {
            console.log(`${clientId}, Connection Closed`);
            clients = clients.filter(client => client.id !== clientId);
        })
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

function sendEventsToAll(newEmail) {
    clients.forEach(client =>
        client.res.write(`data: ${JSON.stringify(newEmail)}\n\n`)
    );
}

const TOKEN_PATH = path.join(__dirname, "../json/token.json");
if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(tokens);
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

        lastHistoryId = response.data.historyId;
        return console.log("Watch Response", response.data);
    } catch (error) {
        console.log("Error", error);
        throw error;
    }
}

async function handleNewMail(req, res) {
    const message = Buffer.from(req.body.message.data, "base64").toString("utf8")
    const data = JSON.parse(message);
    console.log("New Gmail Notification", data);
    
    try {
        if (lastHistoryId) {
            const historyResponse = await gmail.users.history.list({
                userId: "me",
                startHistoryId: lastHistoryId,
                historyTypes: ["messageAdded"], // only get new emails
            });

            if (historyResponse.data.history) {
                for (const history of historyResponse.data.history) {
                    for (const m of history.messages || []) {
                        if (!await Message.exists({ gmailId: m.id })) {
                            const fullMessage = await getMessage(m.id);
                            const parsed = parseMessage(fullMessage);
                            parsed.body = parsed.body.replace(/\s+/g, " ").trim();

                            const { subject, from, date, body } = parsed;
                            console.log("NEW EMAIL:", parsed);

                            const newEmail = await Message.create({
                                gmailId: m.id,
                                subject,
                                from,
                                date,
                                body
                            });
                            sendEventsToAll(newEmail);
                        }
                    }
                }
            }
        }

        lastHistoryId = data.historyId;

    } catch (error) {
        if (error.code === 404) {
            console.log("History expired, doing full sync...");
            const messagesList = await gmail.users.messages.list({
                userId: "me",
                labelIds: ["INBOX"],
                maxResults: 10
            });

            for (const m of messagesList.data.messages || []) {
                if (!await Message.exists({ gmailId: m.id })) {
                    const fullMessage = await getMessage(m.id);
                    const parsed = parseMessage(fullMessage);
                    parsed.body = parsed.body.replace(/\s+/g, " ").trim();
                    await Message.create({
                        gmailId: m.id, // 👈 unique Gmail ID
                        subject: parsed.subject,
                        from: parsed.from,
                        date: parsed.date,
                        body: parsed.body
                    });
                }
            }

            lastHistoryId = data.historyId; // reset sync point
            return;
        }
    }
    res.status(200).send("OK");
}

async function handleListMessage(req, res) {
    try {
        const messages = await Message.find();
        console.log(messages);
        return res.render("homepage", { messages });
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

module.exports = {
    handleListMessage,
    startWatch,
    handleNewMail,
    handleEvents
}