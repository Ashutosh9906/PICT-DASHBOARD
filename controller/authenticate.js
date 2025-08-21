const { google } = require("googleapis");

const credentials = require("../json/secrets.json");
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);


async function handleAuthentication(req, res){
    const authUrl = oAuth2Client.generateAuthUrl({
        access_types: 'offlie',
        scope: 'https://www.googleapis.com/auth/gmail.readonly'
    })
    res.redirect(authUrl);
}

module.exports = {
    handleAuthentication
}