const { Schema, model } = require("mongoose")

const messageSchema = new Schema({
    gmailId: {
        type: String,
        required: true
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
    }
}, { timestamps: true });

const Message = model("messages", messageSchema);

module.exports = Message;