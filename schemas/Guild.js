const mongoose = require("mongoose");

const GuildSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String
    },
    channel: {
        type: String, //which channel the bot can send a message 
        default: ""
    },
    allowsRoles: {
        type: Boolean,
        default: true
    },
    shopRotation: {
        type: Date,
    }
});
module.exports = mongoose.model("Guild", GuildSchema);