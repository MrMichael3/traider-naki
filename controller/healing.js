
const healUnit = async (user, amount, daily = false) => {
    const notHealableStatus = ["unconscious"];
    if (notHealableStatus.includes(user.status)) {
        //can't heal user
        return false;
    }
    maxHealth = user.unit.max_health;
    currentHealth = user.unit.current_health;
    if (currentHealth === maxHealth) {
        //user has already full health
        return false;
    }
    if (daily) {
        //daily heal
        if (user.unit.last_health_update > (Date.now - (3600 * 1000 * 20))) {
            //can't use daily heal again
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
        currentHealth = Math.min(currentHealth + (maxHealth * amount), maxHealth);
        user.unit.current_health = Math.round(currentHealth);
        await user.save();
        return true;
    }
    currentHealth = Math.min(currentHealth+amount, maxHealth);
    user.unit.current_health = Math.round(currentHealth);
    await user.save();
    return true;

}
module.exports = { healUnit };