const mongoose = require('mongoose');
const User = require('./../User.js');

const deleteUser = async (id) => {
    //delete user by discord id
    try {
        await User.deleteOne({ discord_id: id });
        return;
    }
    catch {
        console.log(`failed to delete user ${id}`);
    }

}
module.exports = deleteUser;