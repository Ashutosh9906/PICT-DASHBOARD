import { Schema, model } from "mongoose";

const messageSchema = new Schema({
    msgId: {
        type: String,
        required: true,
        unique: true
    },
    subject: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    body: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Message = model("messages", messageSchema);

export default Message;