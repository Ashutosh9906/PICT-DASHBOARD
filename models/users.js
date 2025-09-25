import { Schema, model } from "mongoose";

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    allowedEmails: {
        type: [String],
        default: []
    }
}, { timestamps: true })

const User = model("users", userSchema);

export default User;