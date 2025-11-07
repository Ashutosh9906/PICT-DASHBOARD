import { Schema, model } from "mongoose";
import { required } from "zod/mini";

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
        type: [
            {
                email: {type: String, required: true},
                type: {type: String, required: true}
            }
        ],
        default: []
    }
}, { timestamps: true })

const User = model("users", userSchema);

export default User;