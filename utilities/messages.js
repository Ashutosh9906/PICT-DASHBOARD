const { google } = require("googleapis");
const oAuth2Client = require("../credentials");

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

async function getMessage(messageId) {
    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
    });
    return response.data;
}

function parseMessage(message) {
    const headers = message.payload.headers;

    const subject = headers.find(h => h.name === 'Subject')?.value;
    const from = headers.find(h => h.name === 'From')?.value;
    const date = headers.find(h => h.name === 'Date')?.value;

    let body = "";
    if (message.payload.parts) {
        const part = message.payload.parts.find(p => p.mimeType === 'text/plain');
        if (part && part.body && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
    } else if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return { subject, from, date, body };
}

module.exports = {
    getMessage,
    parseMessage
}