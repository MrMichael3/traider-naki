const mongoose = require("mongoose");

const GuildSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
    },
    channel: String //which channel the bot can send a message 
});
module.exports = mongoose.model("Guild", GuildSchema);