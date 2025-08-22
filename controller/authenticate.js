const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const oAuth2Client = require("../credentials");
const TOKEN_PATH = path.join(__dirname, '..', 'json', 'token.json');

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

async function handleVerifyEmail(req, res) {
    try {
        const code = req.query.code;
        // const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.getToken(code).then(({ tokens }) => {
            oAuth2Client.setCredentials(tokens);
            
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            console.log("Tokens stored in token.json:", tokens);
        });
        return res.redirect("/messages");
    } catch (error) {
        console.log("Error", error);
        return res.status(400).json({ err: "Internal Server Error" })
    }
}

module.exports = {
    handleAuthentication,
    handleVerifyEmail
}