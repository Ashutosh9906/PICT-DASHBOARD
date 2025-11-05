// testHttps.js
import https from "https";

https.get("https://oauth2.googleapis.com/token", (res) => {
  console.log("Status:", res.statusCode);
}).on("error", (err) => {
  console.error("Error:", err);
});
