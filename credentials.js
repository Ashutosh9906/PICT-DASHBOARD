import { google } from "googleapis";
import { configDotenv } from "dotenv";
configDotenv();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} = process.env;

// 🔒 Fail fast if any env var is missing
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error("❌ Missing Google OAuth environment variables");
  console.error({
    GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: !!GOOGLE_REDIRECT_URI
  });
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export default oAuth2Client;
