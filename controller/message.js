const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const oAuth2Client = require("../credentials");
const { getMessage, parseMessage } = require("../utilities/messages")
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const TOKEN_PATH = path.join(__dirname, "../json/token.json");
if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(tokens);
}

async function handleListMessage(req, res) {
    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            labelIds: ['INBOX'],
            maxResults: 5
        })

        for (const msg of response.data.messages) {
            const fullMessage = await getMessage(msg.id);
            const parsed = parseMessage(fullMessage);
            // parsed.body = parsed.body.replace(/https?:\/\/[^\s]+/g, "");
            parsed.body = parsed.body.replace(/\s+/g, " ").trim();
            console.log(parsed);
        }
        return res.status(200).json({ msg: "Messages parsed successfully" });
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

module.exports = {
    handleListMessage
}