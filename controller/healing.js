const mongoose = require('mongoose');
const User = require('./../User.js');

const healUnit = async (user, amount, daily = false) => {
    const notHealableStatus = ["unconscious", "atQuest", "endQuest", "atEvent"];
    console.log(`User status: ${user.status}`);
    if (notHealableStatus.includes(user.status)) {
        //can't heal user
        console.log(`Can't heal user ${user.username}`);
        return false;
    }
    maxHealth = user.unit.max_health;
    currentHealth = user.unit.current_health;
    if (currentHealth === maxHealth) {
        //user has already full health
        console.log(`user has ${currentHealth}/${maxHealth}`);
        return false;
    }
    if (daily) {
        //daily heal
        console.log(`daily heal`);
        if (user.unit.last_health_update > (Date.now - (3600 * 1000 * 20))) {
            //can't use daily heal again
            console.log(`can't use daily heal again`);
            return false;
        }
        currentHealth = Math.min(currentHealth + (maxHealth * amount), maxHealth);
        user.unit.current_health = Math.round(currentHealth);
        user.unit.last_health_update = Date.now();
        await user.save();
        return true;
    }
    if (amount <= 1) {
        //percentage heal
        console.log(`percentage heal`);
        currentHealth = Math.min(currentHealth + (maxHealth * amount), maxHealth);
        user.unit.current_health = Math.round(currentHealth);
        await user.save();
        return true;
    }
    console.log(`absolute heal`);
    currentHealth = Math.min(currentHealth+amount, maxHealth);
    user.unit.current_health = Math.round(currentHealth);
    await user.save();
    return true;

}
module.exports = { healUnit };