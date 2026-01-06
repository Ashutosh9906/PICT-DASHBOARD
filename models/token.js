import { Schema, model } from "mongoose";

const tokenSchema = new Schema({
  provider: {
    type: String,
    default: "google"
  },
  encryptedRefreshToken: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Token = model("token", tokenSchema);

export default Token;