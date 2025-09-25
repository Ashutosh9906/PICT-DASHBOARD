import { Schema, model } from "mongoose";

const lasthistoryIDSchema = new Schema({
    _id: {
        type: String,
        default: 'gmail-history'
    },
    lastHistoryId: {
        type: String,
        required: true
    }
})

const lastHistoryId = model("lastHistoryId", lasthistoryIDSchema);

export default lastHistoryId;