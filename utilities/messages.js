import { google } from "googleapis";
import oAuth2Client from "../credentials.js";
import qp from "quoted-printable";
import lastHistoryId from "../models/lastHistory.js";

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

async function getTop10Messages() {
    try {
        const res = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10
        })

        if (!res.data.messages) {
            console.log("No messages are there to fetch");
            return [];
        }
        console.log("📩 Top 10 Unread Emails:");
        let results = [];
        for (const msg of res.data.messages) {
            const msgRes = await gmail.users.messages.get({
                userId: "me",
                id: msg.id
            })
            const payload = msgRes.data.payload;
            const headers = payload.headers;

            const subject = headers.find(h => h.name === "Subject")?.value;
            const from = headers.find(h => h.name === "From")?.value;
            const date = headers.find(h => h.name === "Date")?.value;

            let body = "";
            if (payload.parts) {
                const part = payload.parts.find(p => p.mimeType === "text/plain");
                if (part?.body?.data) {
                    body = Buffer.from(part.body.data, "base64").toString("utf8");
                }
            } else if (payload.body?.data) {
                body = Buffer.from(payload.body.data, "base64").toString("utf8");
            }

            results.push({ msgId: msg.id, subject, from, date, body });
        }

        return results;
    }
    catch (error) {
        console.log(error);
    }
}

async function fetchMailById(msgId) {
    try {
        const fullMessage = await google.gmail({ version: 'v1', auth: oAuth2Client }).users.messages.get({
            userId: "me",
            id: msgId
        });

        const payload = fullMessage.data.payload;
        const headers = payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        let body = '';

        if (payload.parts) {
            const part = payload.parts.find(p => p.mimeType === 'text/plain');
            if (part?.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf8');
            }
        } else if (payload.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf8');
        }

        body = cleanBody(body);

        return {subject, from, date, body};
    } catch (error) {
        console.log(error);
    }
}

async function getLastHistoryId() {
  const doc = await lastHistoryId.findById('gmail_history');
  return doc?.lastHistoryId || null;
}

async function setLastHistoryId(id) {
  await lastHistoryId.findByIdAndUpdate(
    'gmail_history',
    { lastHistoryId: id },
    { upsert: true, new: true }
  );
}

function cleanBody(rawBody) {
    // Step 1: Decode quoted-printable
    let body = qp.decode(rawBody);

    // Step 2: Normalize newlines but keep them
    body = body.replace(/\r\n?/g, "\n");

    // Step 3: Keep only text before '---'
    const index = body.indexOf('---');
    if (index !== -1) {
        body = body.substring(0, index);
    }

    // Step 4: Collapse multiple spaces (but not newlines!)
    body = body.replace(/[ \t]{2,}/g, " ");

    // Step 5: Trim leading/trailing spaces
    body = body.trim();

    return body;
}

function formatBody(body) {
  if (!body) return "";

  // 1. Convert newlines to <br>
  let formatted = body.replace(/\n/g, "<br>");

  // 2. Convert any http/https links into clickable <a> tags
  formatted = formatted.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return formatted;
}

export { 
    getMessage,
    parseMessage,
    getTop10Messages,
    cleanBody,
    fetchMailById,
    getLastHistoryId,
    setLastHistoryId,
    formatBody
};
