import { google } from "googleapis";
import fs from "fs";
import path from "path";

const credentialsPath = path.resolve("./json/credentials.json");
const rawData = fs.readFileSync(credentialsPath, "utf-8");
const credentials = JSON.parse(rawData);

const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

export default oAuth2Client;
