const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose")
const { google } = require("googleapis");
const { config } = require("dotenv");
config();

const app = express();
const oAuth2Client = require("./credentials");

mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("MongoDB Connected"));

const authenticateRoute = require("./routes/authenticate");
const messageRoute = require("./routes/messages");
const { startWatch } = require("./controller/message");

app.use(express.json());

//Start Watch on INBOX
startWatch();

//To authenticate User
app.use("/user", authenticateRoute);
app.use("/messages", messageRoute);

app.listen(process.env.PORT, () => console.log(`Server started at port ${process.env.PORT}`));    