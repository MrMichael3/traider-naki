const mongoose = require('mongoose');
const User = require('./schemas/User.js');
const unitStats = require('./unitStats.json');

function getUnitStats(u) {
    var unit = {};
    switch (u) {
        case "druidNaki":
            unit = unitStats.starterUnits.find(obj => obj.id === 1);
            break;
        case "guardNaki":
            unit = unitStats.starterUnits.find(obj => obj.id === 2);
            break;
        case "forestSpirit":
            unit = unitStats.starterUnits.find(obj => obj.id === 3);
            break;
        case "elderSpirit":
            unit = unitStats.starterUnits.find(obj => obj.id === 4);
            break;
        default:
            console.log(`unit ${u} not found!`);
    }
    return unit;
}
const handleNewUser = async (user) => {
    //check if user already exists
    const duplicate = await User.findOne({ discord_id: user.id, guild_id: user.guild }).exec();
    if (duplicate) {
        return;
    }
    //get initial unit stats
    const unit = getUnitStats(user.unit);
    try {
        //create new user
        const result = await User.create({
            "username": user.tag,
            "discord_id": user.id,
            "guild_id": user.guild,
            "unit": {
                "unit_type": user.unit,
                "current_health": unit.health,
                "max_health": unit.health,
                "min_attack": unit.minAttack,
                "max_attack": unit.maxAttack
            }
        })
        return result;
    } catch (err) {
        console.log(err);
    }
}
module.exports = handleNewUser;