const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    guild_id: {
        type: String,
        required: true
    },
    discord_id: {
        type: String,
        required: true
    },
    unit: {
        unit_type: String,
        xp: { type: Number, default: 0 },
        current_health: Number,
        max_health: Number,
        last_health_update: {
            type: Date,
            default: () => (Date.now() - (3600 * 1000 * 24))
        },
        min_attack: Number,
        max_attack: Number
    },
    status: {
        type: String,
        default: "idle",
    },
    status_time: {
        type: Date,
        default: () => (Date.now())
    },
    inventory: [
        {
            item_name: String,
            amount: Number,
            consumable: Boolean
        }
    ],
    soulstones: {
        type: Number,
        default: 0
    },
    mining: {
        last_mining: {
            type: Date,
            default: () => (Date.now() - (3600 * 1000 * 24))
        },
        streak: {
            type: Number,
            default: 0
        }
    },
    quest: [
        {
            title: {
                type: String,
            },
            difficulty: {
                type: Number,  // 1: easy, 2: medium,  3: hard
            },
            duration: {
                type: Number, //in seconds
                default: 3600
            },
            enemies: [
                {
                    unit: String,
                    level: Number,
                    amount: {
                        type: Number,
                        default: 1
                    },
                    stage: Number
                }
            ]
        }
    ],
    pvp_battles: [{
        time: Date,
        opponent: String,
        result: String
    }]
})
userSchema.methods.sayHi = function () {
    console.log(`Hi, my id is ${this.discord_id}`)
}
module.exports = mongoose.model("User", userSchema)    