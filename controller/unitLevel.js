const mongoose = require('mongoose');
const User = require('./../User.js');
const unitStats = require('./../unitStats.json');
const { MessageEmbed } = require('discord.js');
const emojis = require('./../emojis.json');

const baseXp = 350 //xp for level 0;
const multiplier = 1.2;
const levelOne = 0; //xp needed for first lv up
const statsMultiplier = 10; //increase health and attack per level

function createEmbeds(userBefore, userAfter) {
    const embeds = [];
    var unitName = userAfter.unit.unit_type;
    unitName = unitName.replace(/([A-Z])/g, ' $1');
    unitName = unitName.charAt(0).toUpperCase() + unitName.slice(1);
    const levelBefore = getUnitLevel(userBefore.xp);
    const levelAfter = getUnitLevel(userAfter.unit.xp);
    const username = userAfter.username.slice(0, userAfter.username.indexOf('#'));
    const unitStats = new MessageEmbed()
        .setTitle(`Level Up!`)
        .setThumbnail("https://c.tenor.com/VaLGhMfFcecAAAAi/emir-mekan-gi%CC%87f.gif")
        .setDescription(`<@${userAfter.discord_id}> the ${unitName}`)
        .addFields(
            { name: '**Level**', value: `**${levelBefore} -> ${levelAfter}**` },
            { name: '**Health**', value: `${userBefore.max_health}${emojis.defensive} -> ${userAfter.unit.max_health}${emojis.defensive}` },
            { name: '**Attack**', value: `${userBefore.min_attack}-${userBefore.max_attack}${emojis.offensive} -> ${userAfter.unit.min_attack}-${userAfter.unit.max_attack}${emojis.offensive}` },
        )
    embeds.push(unitStats);
    return embeds;
}
const xpOfLevel = (lv) => {
    return (Math.round(baseXp * Math.pow(multiplier, lv - 1) - baseXp));
}
const getUnitLevel = (xp) => {
    //calculate level, each unit has same xp rate, min lv: 1
    if (xp < levelOne) {
        return 1;
    }
    return (Math.floor(Math.log((baseXp + xp) / baseXp) / Math.log(multiplier)) + 1);
}
const levelUp = async (user, xpBefore, channel) => {
    //increase hp and attack by 20% each level
    //formula: health = baseHealth (lv1) * ((100+20)/100)^level
    const xp = user.unit.xp;
    const lv = getUnitLevel(xp);
    const previousLv = getUnitLevel(xpBefore);
    const userBefore = {};
    const unitType = user.unit.unit_type;
    const previousHealth = user.unit.max_health;
    const previousMinAttack = user.unit.min_attack;
    const previousMaxAttack = user.unit.max_attack;
    userBefore['max_health'] = user.unit.max_health;
    userBefore['min_attack'] = user.unit.min_attack;
    userBefore['max_attack'] = user.unit.max_attack;
    userBefore['xp'] = xpBefore;


    if (lv <= previousLv && xpOfLevel(lv + 1) > xp) {
        console.log(`error: ${user.username} lv ${lv} hasn't leveled up!`);
        return;
    }
    switch (user.unit.unit_type) {
        case "druidNaki":
            user.unit.max_health = unitStats.starterUnits.find(x => x.id === 1).health * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.min_attack = unitStats.starterUnits.find(x => x.id === 1).minAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.max_attack = unitStats.starterUnits.find(x => x.id === 1).maxAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            break;
        case "guardNaki":
            user.unit.max_health = unitStats.starterUnits.find(x => x.id === 2).health * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.min_attack = unitStats.starterUnits.find(x => x.id === 2).minAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.max_attack = unitStats.starterUnits.find(x => x.id === 2).maxAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            break;
        case "forestSpirit":
            user.unit.max_health = unitStats.starterUnits.find(x => x.id === 3).health * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.min_attack = unitStats.starterUnits.find(x => x.id === 3).minAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.max_attack = unitStats.starterUnits.find(x => x.id === 3).maxAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            break;
        case "elderSpirit":
            user.unit.max_health = unitStats.starterUnits.find(x => x.id === 4).health * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.min_attack = unitStats.starterUnits.find(x => x.id === 4).minAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            user.unit.max_attack = unitStats.starterUnits.find(x => x.id === 4).maxAttack * Math.pow(((100 + statsMultiplier) / 100), (lv - 1));
            break;
        default:
            console.log(`the unit ${user.unit.unit_type} doesn't exist!`);
    }
    user.unit.current_health = Math.round(Math.min(user.unit.current_health + Math.max(user.unit.max_health - previousHealth, 0), user.unit.max_health));
    user.unit.max_health = Math.round((user.unit.max_health + Number.EPSILON));
    user.unit.min_attack = Math.round((user.unit.min_attack + Number.EPSILON) * 10) / 10;
    user.unit.max_attack = Math.round((user.unit.max_attack + Number.EPSILON) * 10) / 10;
    await user.save();

    //show new stats
    embedsList = createEmbeds(userBefore, user);
    if (channel) {
        await channel.send({ embeds: embedsList });
    }
    return;
}
module.exports = { getUnitLevel, levelUp, xpOfLevel };
