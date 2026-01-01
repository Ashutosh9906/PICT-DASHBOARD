import { google } from "googleapis";
import fs from "fs";
import path from "path";

import oAuth2Client from "../credentials.js";
import { handleResponse } from "../utilities/messages.js";
const TOKEN_PATH = path.join(new URL('.', import.meta.url).pathname, '..', 'json', 'token.json');

async function handleAuthentication(req, res) {
    try {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: "consent",
            scope: ['https://www.googleapis.com/auth/gmail.readonly']
        })
        return res.redirect(authUrl);
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

// async function handleVerifyEmail(req, res) {
//     try {
//         const code = req.query.code;
//         // const { tokens } = await oAuth2Client.getToken(code);
//         oAuth2Client.getToken(code).then(({ tokens }) => {
//             oAuth2Client.setCredentials(tokens);

//             fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
//             console.log("Tokens stored in token.json:", tokens);
//         });
//         return res.redirect("/messages");
//     } catch (error) {
//         console.log("Error", error);
//         return res.status(400).json({ err: "Internal Server Error" })
//     }
// }

async function handleVerifyEmail(req, res, next) {
    try {
        const code = req.query.code;

        const { tokens } = await oAuth2Client.getToken(code);
        let existingTokens = {};
        if (fs.existsSync(TOKEN_PATH)) {
            existingTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
        }
        const finalTokens = {
            refresh_token: tokens.refresh_token || existingTokens.refresh_token,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date
        };
        if (!finalTokens.refresh_token) {
            throw new Error("Refresh token missing");
        } 
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(finalTokens, null, 2));
        console.log("Refresh token preserved safely");
        return handleResponse(res, 200, "Token generated successfully");
    }
    catch (error) {
        next(error);
    }
}

export { handleAuthentication, handleVerifyEmail };
