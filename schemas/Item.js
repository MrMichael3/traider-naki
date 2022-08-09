const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    description_short: {
        type: String
    },
    description_long: {
        type: String
    },
    quantity: {
        type: Number
    },
    cost: {
        type: Number
    },
    image: {
        type: String
    },
    consumable: {
        type: Boolean,
        default: true
    },
    effect: {
        type: Number
    },
    buyable: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Item", ItemSchema) 