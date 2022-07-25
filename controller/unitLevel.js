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
const levelUp = (user)=>{
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
    //user.unit.max_health = unitStats[blablabla] * Math.pow((100*statsMultiplier)/100), lv);

    return;
}
module.exports = {getUnitLevel, levelUp};
