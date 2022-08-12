const mongoose = require("mongoose");

const QuestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: "A dangerous quest!"
    },
    region: String, //which island type the quest is at
   
    type: { //"exploration", "combat", "treasure hunt"
        type: String,
        required: true
    }


});

module.exports = mongoose.model("Quest", QuestSchema) 