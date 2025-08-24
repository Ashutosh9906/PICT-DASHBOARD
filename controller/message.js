const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const oAuth2Client = require("../credentials");
const { getMessage, parseMessage } = require("../utilities/messages")
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
let lastHistoryId = null;

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
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

async function handleNewMail(req, res) {
    try {
        const message = Buffer.from(req.body.message.data, "base64").toString("utf8")
        const data = JSON.parse(message);
        console.log("New Gmail Notification", data);

        if (lastHistoryId) {
            const historyResponse = await gmail.users.history.list({
                userId: "me",
                startHistoryId: lastHistoryId,
                historyTypes: ["messageAdded"], // only get new emails
            });

            if (historyResponse.data.history) {
                for (const history of historyResponse.data.history) {
                    for (const m of history.messages || []) {
                        const fullMessage = await getMessage(m.id);
                        const parsed = parseMessage(fullMessage);
                        parsed.body = parsed.body.replace(/\s+/g, " ").trim();
                        console.log("NEW EMAIL:", parsed);
                    }
                }
            }
        }

        lastHistoryId = data.historyId; 

    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
    res.status(200).send("OK");
}

async function fetchMessages() {
    const response = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: 5
    })

    const parsedMessages = [];
    for (const msg of response.data.messages) {
        const fullMessage = await getMessage(msg.id);
        const parsed = parseMessage(fullMessage);
        // parsed.body = parsed.body.replace(/https?:\/\/[^\s]+/g, "");
        parsed.body = parsed.body.replace(/\s+/g, " ").trim();
        parsedMessages.push(parsed);
    }
    return parsedMessages;
}

async function handleListMessage(req, res) {
    try {
        const messages = await fetchMessages();
        console.log(messages);
        return res.status(200).json({ msg: "Email Parsed successfully" });
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

module.exports = {
    handleListMessage,
    startWatch,
    handleNewMail
}