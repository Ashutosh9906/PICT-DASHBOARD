import Token from "../models/token.js";
import { decrypt } from "../utilities/messages.js";
import oAuth2Client from "../credentials.js";

export async function ensureGoogleAuth() {
  const tokenDoc = await Token.findOne({ provider: "google" });

  if (!tokenDoc) {
    throw new Error("Google OAuth not initialized");
  }

  const refreshToken = decrypt(
    JSON.parse(tokenDoc.encryptedRefreshToken)
  );

  oAuth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return oAuth2Client;
}
