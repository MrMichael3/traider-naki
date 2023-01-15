const mongoose = require('mongoose');
const User = require('./../schemas/User.js');

const deleteUser = async (userId, guildId) => {
    //delete user by discord id
    try {
        await User.deleteOne({ discord_id: userId, guild_id: guildId });
        return;
    }
    catch {
        console.log(`failed to delete user ${id}`);
    }

}
module.exports = deleteUser;