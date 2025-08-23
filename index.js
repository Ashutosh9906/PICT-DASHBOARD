const express = require("express");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis")
const { config } = require("dotenv")
config();

const app = express();
const oAuth2Client = require("./credentials");

const authenticateRoute = require("./routes/authenticate");
const messageRoute = require("./routes/messages");

//To authenticate User
app.use("/user", authenticateRoute);
app.use("/messages", messageRoute);

app.listen(process.env.PORT, () => console.log(`Server started at port ${process.env.PORT}`));    