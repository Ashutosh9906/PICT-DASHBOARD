import oAuth2Client from "../credentials.js";
import { encrypt, handleResponse } from "../utilities/messages.js";
import Token from "../models/token.js";

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
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Refresh token not returned");
    }
    const encrypted = encrypt(tokens.refresh_token);

    await Token.findOneAndUpdate(
      { provider: "google" },
      {
        encryptedRefreshToken: JSON.stringify(encrypted),
        expiryDate: new Date(tokens.expiry_date),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    return handleResponse(res, 200, "Gmail access granted successfully");
  } catch (err) {
    next(err);
  }
}

export { handleAuthentication, handleVerifyEmail };
