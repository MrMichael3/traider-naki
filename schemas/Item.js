const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    item_id: {
        type: String,
        required: true,
        unique: true
    },
    description: {
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
    buyable: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Item", ItemSchema) 