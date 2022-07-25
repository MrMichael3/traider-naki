const mongoose = require('mongoose');
const User = require('./../User.js');
const unitStats = require('./../unitStats.json');
const baseXp = 350 //xp for level 0;
const multiplier = 1.2;
const levelOne = baseXp * multiplier; //xp needed for first lv up
const statsMultiplier = 20; //increase health and attack per level


const getUnitLevel = (xp)=>{
    //calculate level, each unit has same xp rate, min lv: 1
    if(xp < levelOne){
        return 1;
    }
    return (Math.floor(Math.log(xp/baseXp)/Math.log(multiplier))+1);
}
const levelUp = async (user)=>{
    //increase hp and attack by 20% each level
    //formula: health = baseHealth (lv1) * ((100+20)/100)^level
    console.log("hey, you level up :)")
    const xp = user.unit.xp;
    const lv = getUnitLevel(xp);
    const unitType = user.unit.unit_type;
    const previousHealth = user.unit.max_health;
    const previousMinAttack = user.unit.min_attack;
    const previousMaxAttack = user.unit.max_attack;
    if(lv <= 1){
        console.log(`error: unit lv ${lv} hasn't leveled up!`);
        return;
    }
    const getUser = await User.findOne({discord_id: user.discord_id}).exec();
    switch(user.unit.unit_type){
        case "druidNaki":
            console.log(`health 1: ${getUser.unit.max_health}`);
            getUser.unit.max_health =  unitStats.starterUnits.find(x => x.id === 1).health * Math.pow(((100+statsMultiplier)/100), (lv-1));
            console.log(`health 2: ${getUser.unit.max_health}`);
            getUser.unit.max_health = Math.round((getUser.unit.max_health + Number.EPSILON)*100)/100;
            console.log(`health 3: ${getUser.unit.max_health}`);
            getUser.unit.min_attack =  unitStats.starterUnits.find(x => x.id === 1).minAttack * Math.pow(((100+statsMultiplier)/100), (lv-1));
            getUser.unit.min_attack = Math.round((user.unit.min_attack + Number.EPSILON)*100)/100;
            getUser.unit.max_attack =  unitStats.starterUnits.find(x => x.id === 1).maxAttack * Math.pow(((100+statsMultiplier)/100), (lv-1));
            getUser.unit.max_attack = Math.round((user.unit.max_attack + Number.EPSILON)*100)/100;
            console.log(getUser);
            getUser.soulstones = 500;
            await getUser.save();
            break;

    }

    return;
}
module.exports = {getUnitLevel, levelUp};
