const unitStats = require('./../unitStats.json');



const isEffective = (attacker, defender) => {
    //return true if attacker unit is effective against defender unit
    let attackerUnit = unitStats.starterUnits.find(obj => obj.name === attacker);
    if (!attackerUnit) {
        attackerUnit = unitStats.wildCreatures.find(obj => obj.name === attacker);
    }
    let defenderUnit = unitStats.starterUnits.find(obj => obj.name === defender);
    if (!defenderUnit) {
        defenderUnit = unitStats.wildCreatures.find(obj => obj.name === defender);
    }
    if (!attackerUnit || !defenderUnit) {
        console.log(`unit not found at effectiveness check!`);
        return false;
    }
    if (attackerUnit.strongAgainst.includes(defenderUnit.id)) {
        //attacker is effective against defender
        return true;
    }
    return false;
}

module.exports = { isEffective };