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
    regions: { //location of the quest per stage
        stage_one: String,
        stage_two: String,
        stage_three: String
    },
    type: { //"exploration", "combat", "treasure hunt"
        type: String,
        required: true
    }


});

module.exports = mongoose.model("Quest", QuestSchema) 