import express from "express";
import path from "path";
import mongoose from "mongoose";
import { config } from "dotenv";
import rateLimit from "express-rate-limit"
config();

import { ensureGoogleAuth } from "./utilities/googleAuthUtil.js";
import { handlegetMessage, startWatch } from "./controller/messageController.js";

import authenticateRoute from "./routes/authenticate.js";
import messageRoute from "./routes/messages.js";
import userRoutes from "./routes/user.js"
import errorHandling from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  });
  
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.set("trust proxy", 1);

async function bootstrap() {
  try {
    await ensureGoogleAuth();  
    await startWatch();  
    console.log("Gmail watch initialized");
  } catch (err) {
    console.error("Startup failed:", err.message);
  }
}

bootstrap();

//Rate Limiter
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        if (req.accepts("html")) {
            return res.status(429).render("rateLimit");
        }

        res.status(429).json({
            error: "Too many requests. Please try again later."
        });
    }
});


//To authenticate User
app.get("/", (req, res) => {
  return res.redirect("/messages");
});
app.get("/healthZ", (req, res) => {
  return res.status(200).send("OK");
})
// app.use("/user", authenticateRoute);
app.use("/messages", limiter, messageRoute);
app.use("/userAdmin", limiter, userRoutes)

//central error handling system
app.use(errorHandling)

app.listen(process.env.PORT, () => {
        console.log(`Server started at port ${process.env.PORT}`)
});    


//Pagination 
//In memory cache layer
//Queue all the incoming 
//cors
//central error handling middleware
//token expires after an hour  leading to -> ngrok: 401:unauthorized (error)
//use referesh token expires after an period of 7 days in testing mode
//startwatch will also be valid for 1 hour it expire after 1 hour 
//revoke the startwatch and the token