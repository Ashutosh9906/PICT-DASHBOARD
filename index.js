const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis")
const { config } = require("dotenv")
config();

const app = express();
const oAuth2Client = require("./credentials");
const gmail = google.gmail("v1");

const authenticateRoute = require("./routes/authenticate");

const SCOPES = process.env.SCOPES;
const TOKEN_PATH = path.join(__dirname, 'json', 'token.json');

//To authenticate User
app.use("/auth", authenticateRoute);
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  res.send('Authentication successful! You can now check emails.');
});

app.listen(process.env.PORT, () => console.log(`Server started at port ${process.env.PORT}`));    