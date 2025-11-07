import express from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { google } from "googleapis";
import { config } from "dotenv";
config();

const app = express();
import oAuth2Client from "./credentials.js";
const token = JSON.parse(fs.readFileSync("./json/token.json", "utf-8"))

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

import authenticateRoute from "./routes/authenticate.js";
import messageRoute from "./routes/messages.js";
import userRoutes from "./routes/user.js"
import { startWatch } from "./controller/messageController.js";
// const { startWatch } = require("./utilities/messages.js")

app.use(express.json());
oAuth2Client.setCredentials(token)

//Start Watch on INBOX
startWatch()

//To authenticate User
app.use("/user", authenticateRoute);
app.use("/messages", messageRoute);
app.use("/userAdmin", userRoutes)

app.listen(process.env.PORT, () => {
        console.log(`Server started at port ${process.env.PORT}`)
});    


//Pagination 
//In memory cache layer
//Queue all the incoming 
//cors
//central error handling middleware