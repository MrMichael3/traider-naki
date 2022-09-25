const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const Quest = require('./../schemas/Quest.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unitData = require('./../unitStats.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const emojis = require('./../emojis.json');
const { getUnitLevel, statsMultiplier, levelUp } = require('./../controller/unitLevel.js');
const { isEffective } = require('../controller/fightController.js');


const statsMultiplierPercentage = (statsMultiplier + 100) / 100;
const minDuration = 3600 //minimum duration of quests in seconds
const durationPeriod = 36000 //period of quest duration in seconds
const uncommonCollectibleChance = 0.1;
const rareCollectibleChance = 0.2;
const legendaryCollectibleChance = 0.2;
const itemChance = 0.4;
const soulstoneMultiplier = 500; // multiplier * duration/maxDuration * difficulty = base soulstone reward
const xpMultiplier = 10; // multiplier^level = base xp reward
const effectiveMultiplier = 1.5;


function readableTime(ms) {
    let sec = ms / 1000;
    let time = "";
    if (sec > 3600 * 24) {
        //days
        var days = Math.floor(sec / (3600 * 24));
        if (days === 1) {
            time += days + " day ";
        }
        else {
            time += days + " days ";
        }
        sec -= days * 3600 * 24;
    }
    if (sec > 3600) {
        //hours
        var hours = Math.floor(sec / 3600);
        if (hours === 1) {
            time += hours + " hour ";
        }
        else {
            time += hours + " hours ";
        }
        sec -= hours * 3600;
    }
    if (sec > 60) {
        //minutes
        var min = Math.floor(sec / 60);
        time += min + " min ";
        sec -= min * 60;
    }
    if (sec > 0 && ms < 3600 * 1000) {
        sec = Math.round(sec);
        time += sec + " sec";
    }
    return time;

}

function beautifyUnitName(unitType) {
    unitType = unitType.replace(/[A-Z]/g, ' $&').trim();
    unitType = unitType.charAt(0).toUpperCase() + unitType.slice(1);
    return unitType;
}

async function createQuests(user) {
    //create three quests
    /*conditions:
        treasure hunt quests must be difficulty 2 or 3
        dark desert and COI quests must be difficulty 2 or 3
        first quest is always difficulty 1
        difficulty 3 quests available at level 10
        treasure hunt available at level 20
        mysterious wasteland available at level 10
        dark desert and COI available at level 30
        duration of quest depending on region
    */
    const quests = [];
    const userLevel = getUnitLevel(user.unit.xp);
    let counter = 0;
    while (counter < 3) {
        //create a quest
        counter++;
        let questCounter;
        let allowedRegions = ["Magic Marsh", "Mysterious Wasteland", "Dark Desert", "COI"];
        let allowedTypes = ["combat", "exploration", "treasure hunt"];

        if (userLevel < 30) {
            allowedRegions = allowedRegions.filter((f) => { return f !== "Dark Desert" });
            allowedRegions = allowedRegions.filter((f) => { return f !== "COI" });
            if (userLevel < 10) {
                allowedRegions = allowedRegions.filter((f) => { return f !== "Mysterious Wasteland" });
            }
        }
        //select a random quest
        if (counter === 1 || userLevel < 20) {
            //first quest can't be treasure hunt and before lv 20 too
            allowedTypes = ["combat", "exploration"];
            questCounter = await Quest.countDocuments({ type: { $in: allowedTypes }, region: { $in: allowedRegions } }).exec();

        }
        else {
            questCounter = await Quest.countDocuments({ region: { $in: allowedRegions } }).exec();
        }
        if (questCounter === 0) {
            console.log(`Error: no quests available`);
            return;
        }
        const random = Math.floor(Math.random() * questCounter);
        const quest = await Quest.findOne({ region: { $in: allowedRegions }, type: { $in: allowedTypes } }).skip(random).exec();
        let createQuest = {};
        createQuest.enemies = [];
        createQuest.title = quest.title;
        //difficulty
        let diff = Math.floor(Math.random() * 3) + 1;
        const difficultRegions = ["Dark Desert", "COI"];
        if (quest.type === "treasure hunt" || difficultRegions.includes(quest.region)) {
            //treasure hunt and quests in difficult regions must be difficulty 2 or 3
            if (diff < 3) {
                diff += 1;
            }
        }
        else if (counter === 1) {

            //first quest has difficulty 1
            diff = 1;
        }
        if (userLevel < 10 && diff === 3) {

            //no difficulty 3 before level 10
            diff--;
        }
        createQuest.difficulty = diff;

        //duration
        let durationRegionFactor = 1;
        switch (quest.region) {
            case "Magic Marsh":
                durationRegionFactor = 0.25;
                break;
            case "Mysterious Wasteland":
                durationRegionFactor = 0.6;
                break;
            case "Dark Desert":
                durationRegionFactor = 1;
                break;
            case "COI":
                durationRegionFactor = 1.5;
                minDuration = minDuration * 2;
                break;
        }
        var duration = (Math.floor(Math.random() * durationPeriod * durationRegionFactor) + minDuration) * diff; //quest duration at maximum 33h in seconds
        duration = Math.round(duration / (60 * 30)) * (60 * 30); //duration rounded to half hours
        createQuest.duration = duration;
        //enemies
        let factor = 0.75; //factor how strong enemies are
        if (quest.type === "combat") {
            factor = 1.5;
        }
        else if (quest.type === "treasure hunt") {
            factor = 1.25;
        }
        const playerPower = Math.round(user.unit.max_health * (user.unit.min_attack + user.unit.max_attack) / 2);
        const enemyPower = playerPower * (Math.floor(Math.random() * 15 + 16) / 100 * factor * diff); //easy quest: 12%-22.5% of playerPower, hard quest: 72%-135% of pp
        let stage = 1;
        //calculate how enemy power is distributed on three stages
        const powerPerStage = [];
        powerPerStage.push(Math.floor(Math.random() * 21) / 100 * enemyPower);
        powerPerStage.push(Math.floor(Math.random() * 51) / 100 * enemyPower);
        powerPerStage.push(enemyPower - powerPerStage[0] - powerPerStage[1]);
        let possibleEnemies = [];
        switch (quest.region) {
            case "Magic Marsh":
                possibleEnemies = ["Nyxi", "Nyxi", "Nyxi", "Pangoan"];
                break;
            case "Mysterious Wasteland":
                possibleEnemies = ["Nyxi", "Ranax", "Pangoan", "Pangoan"];

                break;
            case "Dark Desert":
                possibleEnemies = ["Ranax", "Ranax", "Athlas"];

                break;
            case "Crater of Immortality":
                possibleEnemies = ["Athlas"];

                break;
            default:
                console.log(`region ${quest.region} is unknown`);
                possibleEnemies = ["Nyxi", "Pangoan"];
        }
        while (stage < 4) {
            //calculate enemys for every stage
            try {
                var enemyType = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
            }
            catch {
                console.log("enemyType not available");
            }
            const enemy = unitData.wildCreatures.find(x => x.name === enemyType);
            const baseAttack = (enemy.minAttack + enemy.maxAttack) / 2;
            let unitLvl = Math.min(50, Math.max(0, Math.floor(Math.log(powerPerStage[stage - 1] / (enemy.health * baseAttack)) / (2 * Math.log(statsMultiplierPercentage)) + 0.2) + 1)); //round up if >= xx.8
            if (stage === 3 && createQuest.enemies.length === 0 && quest.type !== "exploration" && unitLvl === 0) {
                //quests (eploration excluded) should have at least one enemy
                unitLvl = 1;
            }
            if (unitLvl > 0) {
                createQuest.enemies.push({ unit: enemyType, level: unitLvl, stage: stage });
            }
            stage++;
        }
        //add complete quest to the list of quests
        quests.push(createQuest);

    }
    return quests;
}

async function createSelectionEmbed(user) {
    const embeds = [];
    const questStats = []; //important stats per quest
    let counter = 0;
    while (counter < 3) {
        //iterate through the three quests
        let diffStars = "";
        let description = "";
        let questType = "";
        let region = "";
        switch (user.quest[counter].difficulty) {
            case 1:
                diffStars = emojis.battlepoint;
                break;
            case 2:
                diffStars = emojis.battlepoint + emojis.battlepoint;
                break;
            case 3:
                diffStars = emojis.battlepoint + emojis.battlepoint + emojis.battlepoint;
                break;
        }
        let q = await Quest.findOne({ title: user.quest[counter].title }).exec();
        region = q.region;
        description = q.description;
        questType = q.type;
        questStats.push({ diffStars: diffStars, description: description, region: region, questType: questType });
        counter++;
    }
    const questTypes = [];
    const fieldTypes = [];
    const enemyTypes = [];
    for (type of questStats) {
        switch (type.questType) {
            case "exploration":
                questTypes.push(emojis.movement);
                break;
            case "combat":
                questTypes.push(emojis.offensive);
                break;
            case "treasure hunt":
                questTypes.push(emojis.treasure);
                break;
            default:
                questTypes.push(emojis.info);
                break;
        }
        switch (type.region) {
            case "Magic Marsh":
                fieldTypes.push(emojis.field);
                if (Math.round(Math.random() + 0.2)) {
                    enemyTypes.push(emojis.unitNyxi);
                }
                else {
                    enemyTypes.push(emojis.unitPangoan);
                }
                break;
            case "Mysterious Wasteland":
                fieldTypes.push(emojis.field_wasteland);
                if (Math.round(Math.random() + 0.1)) {
                    enemyTypes.push(emojis.unitPangoan);
                }
                else if (Math.round(Math.random())) {
                    enemyTypes.push(emojis.unitRanax);
                }
                else {
                    enemyTypes.push(emojis.unitNyxi);
                }
                break;
            case "Dark Desert":
                fieldTypes.push(emojis.field_dark_desert);
                if (Math.round(Math.random())) {
                    enemyTypes.push(emojis.unitAthlas);
                }
                else {
                    enemyTypes.push(emojis.unitRanax);
                }
                break;
            case "COI":
                fieldTypes.push(emojis.field_coi);
                enemyTypes.push(emojis.unitAthlas);
                break;
            default:
                fieldTypes.push(emojis.field);
                enemyTypes.push(emojis.unitNyxi);
                console.log("default field!");
                break;
        }
    }
    //create embedded message
    const selectionEmbed = new MessageEmbed()
        .setTitle(`Choose a Quest`)
        .setDescription(`You can choose between three quests of different difficulty (${emojis.battlepoint}) and duration.`)
        .addFields(
            { name: `${user.quest[0].title}\n${questStats[0].diffStars}`, value: `\n:clock10: **${readableTime(user.quest[0].duration * 1000)}**\n${questTypes[0]} **${questStats[0].questType}**\n${fieldTypes[0]} **${questStats[0].region}**\nPossible enemy: ${enemyTypes[0]}\n\n${questStats[0].description}`, inline: true },
            { name: `${user.quest[1].title}\n${questStats[1].diffStars}`, value: `\n:clock10: **${readableTime(user.quest[1].duration * 1000)}**\n${questTypes[1]} **${questStats[1].questType}**\n${fieldTypes[1]} **${questStats[1].region}**\nPossible enemy: ${enemyTypes[1]}\n\n${questStats[1].description}`, inline: true },
            { name: `${user.quest[2].title}\n${questStats[2].diffStars}`, value: `\n:clock10: **${readableTime(user.quest[2].duration * 1000)}**\n${questTypes[2]} **${questStats[2].questType}**\n${fieldTypes[2]} **${questStats[2].region}**\nPossible enemy: **${enemyTypes[2]}**\n\n${questStats[2].description}`, inline: true }
        );
    embeds.push(selectionEmbed);
    return embeds;
}
function createQuestReportEmbed(user, description, results, rewards, stage) {
    if (user.quest.length !== 1) {
        console.log(`Error at creating quest report: quest missing`);
        return [];
    }
    const embeds = [];
    //difficulty icons
    let diffStars = "";
    for (let c = 0; c < user.quest[0].difficulty; c++) {
        diffStars += emojis.battlepoint;
    }
    //stage rewards
    let stageSoulstone = rewards[stage - 1].baseSoulstone + rewards[stage - 1].combatSoulstone;
    let stageXp = rewards[stage - 1].baseXp + rewards[stage - 1].combatXp;
    const userLvl = getUnitLevel(user.unit.xp);
    let text = description.find(x => x.stage === stage).text;
    let unitName = user.unit.unit_type.replace(/([A-Z])/g, ' $1');
    unitName = unitName.charAt(0).toUpperCase() + unitName.slice(1);

    //stage enemy
    const enemy = user.quest[0].enemies.find(x => x.stage === stage);
    let enemyDescription = "-";
    let enemyTitle = "-";
    if (enemy) {
        var enemyName = enemy.unit;
        var enemyLevel = enemy.level;
        enemyTitle = `${enemyName} lv ${enemyLevel}`;
        enemyDescription = `Health: ${results.enemy.currentHealth}/${results.enemy.maxHealth}\nAttack: ${results.enemy.minAttack} - ${results.enemy.maxAttack}`;
    }
    const reportEmbed = new MessageEmbed()
        .setTitle(`Quest Report`)
        .setDescription(`${user.quest[0].title} ${diffStars}`)
        .addFields(
            {
                name: `Quest journey`, value: `${text}`,
            },
            {
                name: `${unitName} lv ${userLvl}`, value: `Health:   ${user.unit.current_health}/${user.unit.max_health}\nAttack:  ${user.unit.min_attack} - ${user.unit.max_attack}\n`, inline: true
            },
            { name: enemyTitle, value: enemyDescription, inline: true }
        );

    embeds.push(reportEmbed);
    return embeds;
}

function createReportSummaryEmbed(user, rewards) {
    //difficulty icons
    let diffStars = "";
    for (let c = 0; c < user.quest[0].difficulty; c++) {
        diffStars += emojis.battlepoint;
    }
    let status = "**quest completed**";
    if (user.status === "unconscious") {
        status = "**quest failed**\nLuckily a stranger found and rescued you. You need **20 hours** to recover. A special potion in the shop may help you regenerate faster.";
    }
    let xpReward = 0;
    let soulstoneReward = 0;
    let CollectibleReward = "-";
    let defeatedEnemies = "-";

    //set rewards
    let stageCounter = 1;
    for (stage of rewards) {
        //set xp, soulstone and Collectible reward per stage and add defeated enemy
        xpReward += stage.baseXp + stage.combatXp;
        soulstoneReward += stage.baseSoulstone + stage.combatSoulstone;
        if (stage.Collectible != "") {
            CollectibleReward = stage.Collectible
        }
        if (stage.success) {
            const enemy = user.quest[0].enemies.find(x => x.stage === stageCounter);
            if (enemy) {
                if (defeatedEnemies === "-") {
                    defeatedEnemies = `${enemy.unit}, level ${enemy.level}`;
                }
                else {
                    defeatedEnemies = defeatedEnemies + `\n${enemy.unit}, level ${enemy.level}`;
                }
            }
        }
        stageCounter++;
    }
    const embeds = [];
    const summaryEmbed = new MessageEmbed()
        .setTitle(`Quest Report`)
        .setDescription(`${user.quest[0].title} ${diffStars}`)
        .addFields(
            { name: `Status`, value: status },
            { name: `Your stats`, value: `Health: ${user.unit.current_health}/${user.unit.max_health}${emojis.defensive}\nAttack: ${user.unit.min_attack}${emojis.offensive} - ${user.unit.max_attack}${emojis.offensive}\nXP: ${user.unit.xp}`, inline: true },
            { name: 'Rewards', value: `Xp: ${xpReward}\nSoulstone: ${soulstoneReward}${emojis.soulstone}\nCollectible: ${CollectibleReward}`, inline: true },
            { name: 'Defeated enemies', value: defeatedEnemies, inline: true }
        );
    embeds.push(summaryEmbed);
    return embeds;
}
async function fightSimulator(user, enemy) {
    //computes the result of two units fighting each other
    //formula: health = baseHealth (lv1) * ((100+20)/100)^level
    var result = {};
    const baseEnemy = unitData.wildCreatures.find(x => x.name === enemy.unit);

    if (!baseEnemy) {
        console.log(`Error, enemy '${enemy.unit}' not found in fightSimulator!`);
        result = { success: true, currentHealth: user.unit.current_health };
        return result;
    }
    const playerName = beautifyUnitName(user.unit.unit_type);
    const playerEffective = isEffective(playerName, baseEnemy.name);
    const enemyEffective = isEffective(baseEnemy.name, playerName);

    let playerHealth = user.unit.current_health;
    let enemyHealth = Math.round(baseEnemy.health * Math.pow(statsMultiplierPercentage, enemy.level - 1));
    let enemyAttack = [Math.round(baseEnemy.minAttack * Math.pow(statsMultiplierPercentage, enemy.level - 1) * 100) / 100, Math.round(baseEnemy.maxAttack * Math.pow(statsMultiplierPercentage, enemy.level - 1) * 100) / 100];
    let playerAttacks = Math.round(Math.random()); //boolean if player attacks first

    result.enemy = {};
    result.enemy.maxHealth = enemyHealth;
    result.enemy.minAttack = enemyAttack[0];
    result.enemy.maxAttack = enemyAttack[1];
    let c = 0;
    let fightOnGoing = true;

    while (fightOnGoing) {
        c++;
        //fight until one unit dies
        let attack = 0;
        if (playerAttacks) {
            //player attacks
            playerAttacks = 0;
            attack = Math.floor((Math.random() * (user.unit.max_attack - user.unit.min_attack) + user.unit.min_attack) * 100) / 100;
            if (playerEffective) {
                //increase attack
                attack = Math.floor(attack * effectiveMultiplier * 100) / 100;
            }
            enemyHealth = Math.round(Math.max(enemyHealth - attack, 0));
            if (enemyHealth === 0) {
                //player wins the fight
                result.success = true;
                result.currentHealth = playerHealth;
                result.enemy.currentHealth = enemyHealth;
                fightOnGoing = false;
            }
        }
        else {
            //enemy attacks
            playerAttacks = 1;
            attack = Math.floor((Math.random() * (enemyAttack[1] - enemyAttack[0]) + enemyAttack[0]) * 100) / 100;
            if (enemyEffective) {
                attack = Math.floor(attack * effectiveMultiplier * 100) / 100;
            }
            playerHealth = Math.max(playerHealth - attack, 0);
            if (playerHealth === 0) {
                //enemy wins the fight
                result.success = false;
                result.currentHealth = playerHealth;
                result.enemy.currentHealth = enemyHealth;
                fightOnGoing = false;
            }
        }
    }

    return result;
}

function getRewards(user, stage) {
    //get combat reward for certain stage
    try {
        var quest = user.quest[0];
    }
    catch {
        console.log(`Error at getRewards: no quest found`);
        return;
    }
    let xpReward = 0;
    let soulstoneReward = 0;
    let reward = { soulstone: 0, xp: 0 };
    for (let enemy of quest.enemies) {
        if (enemy.stage === stage) {
            let strength;
            const baseUnit = unitData.wildCreatures.find(unit => unit.name === enemy.unit);
            const health = baseUnit.health * Math.pow(statsMultiplierPercentage, enemy.level - 1);
            const attack = (baseUnit.minAttack + baseUnit.maxAttack) / 2 * Math.pow(statsMultiplierPercentage, enemy.level - 1);
            strength = health * attack;
            baseStrength = baseUnit.health * (baseUnit.minAttack + baseUnit.maxAttack) / 2;
            soulstoneReward += strength / baseStrength * 3;
            xpReward += strength / 100;
            if (quest.type === "exploration") {
                soulstoneReward = soulstoneReward * 1.5;
                xpReward = xpReward * 0.8;
            }
            else if (quest.type === "treasure hunt") {
                soulstoneReward = soulstoneReward * 1.2;
            }
            else if (quest.type === "combat") {
                soulstoneReward = soulstoneReward * 0.8;
                xpReward = xpReward * 1.5;
            }
            xpReward = Math.round(xpReward);
            soulstoneReward = Math.round(soulstoneReward);
            reward.xp = xpReward;
            reward.soulstone = soulstoneReward;
            break;
        }
    }
    return reward;
}

function createDescription(user, quest, stage, enemy, success, rewards) {
    let description = "";
    if (enemy) {
        var combatXp = rewards[stage - 1].combatXp;
        var combatSoulstone = rewards[stage - 1].combatSoulstone;
    }
    switch (quest.region) {
        case "Magic Marsh":
            switch (stage) {
                case 1:
                    if (success) {
                        description += "You are well prepared and start your journey towards the magic marsh island. After a short flight with your airship you land on a gloomy swamp. ";
                        if (enemy) {
                            if (enemy.unit === "Nyxi") {
                                description += `But you didn't chose your landing spot carefully, instead landed directly on a nyxi nest. The nest is completely destroyed and you are looking into the eyes of an angry **level ${enemy.level} nyxi**. You defeat the wild nyxi and get ${combatXp} xp and find ${combatSoulstone} soulstones in the destroyed nest. What a begin into this journey! `;
                            }
                            else {
                                description += `You are discovering the beautiful nature as you wander throught the marsh. On the flight here, you have read a lot about meeting and fighting wild nyxis, but you can't see any wildlife. Suddenly, a rustling in the bushes. You are alarmed, ready to fight. But the wild creatures who appears is not a nyxi, but a more dangerous **level ${enemy.level} Pangoan**!. There is no way of escape, so you decides it's best to directly attack the creature. Your bravery shall be rewarded. The Pangoan has no chance and you get ${combatXp} xp for killing it and finds ${combatSoulstone} soulstone too. `;
                            }
                        }
                        else {
                            description += `After a perfect landing, you check your equipment, moor the airship and take a quick snack. You are in the middle of the swamp and orientation isn't easy. So, you decide to try your luck going south. No wildlife passes your way, but you explore a lot of amazing flora. `;

                        }
                    }
                    else {
                        description += `Because you want to hurry, there is no time to prepare properly for the journey. You take the most important stuff with you and fly with your airship to the magic marsh island. You planned to land on a nice open spot in the swamps, but underestimated fast occuring gusts of wind which drift you away, directly towards the magic forest. `;
                        if (enemy.unit === "Nyxi") {
                            description += `After a rough landing, you are trying to save your equipment out of the destroyed airship. Cursing and lost in thoughts about how to repair the airship, you suddenly startle up when you hear a loud noise. A huge wild **level ${enemy.level} nyxi** appeared behind you. You try your best fighting against the nyxi, but you are exhausted and the nyxi too strong. You feel the wet bite of the nyxi in your chest and scream in pain. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the forest ground.`;
                        }
                        else {
                            description += `After a rough landing, you are trying to save your equipment out of the destroyed airship. Cursing and lost in thoughts about how to repair the airship, you suddenly startle up when you hear a loud noise. A huge wild **level ${enemy.level} pangoan** appeared behind you. You try your best fighting against the pangoan, but you are exhausted and the pangoan too strong. The Pangoan throws you on the ground and wounds you badly. You know you are going to die here in the wild. While you slowly fall **unconscious**, you are wondering since when pangoans are in the magic marsh. The last thing you hear before passing out are footsteps on the forest ground.`;
                        }
                    }
                    break;
                case 2:
                    if (success) {
                        description += `On the second stage of the journey you march through the swamp, enjoying the wild nature around you. But the march is also exhausting and you are looking forward to drying your wet feet at the campfire. `;
                        if (enemy) {
                            if (enemy.unit === "Nyxi") {
                                description += `Dusk is already coming when you suddenly see a horde of nyxis at a near river. You decide to not disturb them and quietly walks a few steps back. Unfortunately, a single **level ${enemy.level} nyxi** became aware of you and quickly hops towards you. After a short fight, you can defeat the nyxi and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. Now you truly deserve some rest at the campfire with some roasted nyxi legs. `;
                            }
                            else {
                                description += `Dusk is already coming when you suddenly see a horde of nyxis at a near river. You decide to not disturb them and quietly walks a few steps back. Unfortunately, on your way around the nyxi horde you pass a wild **level ${enemy.level} pangoan**. In a fierce battle, you gain the upper hand and finish off the pangoan. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. You never ate pangoan before, but you sure it will make a great dinner tonight. `;
                            }
                        }
                        else {

                            description += `Dusk is already coming when you suddenly see a horde of nyxis at a near river. But you are already tired and decide to make a big bow arond them. Finally, you reach the beginning of the forest. As it's too dangerous to discover the magic forest in the dark, you decide to rest at a campfire and continue your journey tomorrow.`;

                        }
                    }
                    else {
                        description += `On the second stage of the journey you march through the swamp, enjoying the wild nature around you. But the march is also exhausting and you are looking forward to drying your wet feet at the campfire. `;
                        if (enemy.unit === "Nyxi") {
                            description += `As dusk is already coming, you get tired and thirsty. Finally, you find a river with clean water and run straight into it without looking. Unfortunately, there is a **level ${enemy.level} nyxi** below the surface next to you. The nyxi rapidly jumps towards you and you barely can defend yourself. After a short but intense fight, the nyxi wins and you fall **unconscious**.`;
                        }
                        else {
                            description += `As dusk is already coming, you get tired and thirsty. Finally, you find a river with clean water and run straight into it without looking. Unfortunately, you aren't the onyl one using the river as drinking source. A giant **level ${enemy.level} Pangoan** appears in front of you. After a short but intense fight, the pangoan wins and you fall **unconscious**.`;
                        }
                    }
                    break;
                case 3:
                    if (success) {
                        description += `You finally reach the magic forest. Amazing flora awaits you and a hint of soulstone magic hangs in the air. As you get deeper into the forest, you watch carefully the nature spectacle around you. `;
                        if (enemy) {
                            if (enemy.unit === "Nyxi") {
                                description += `The forest is full of life. Smaller and bigger creatures, crawling, walking and flying, enliven the forest, however you rarely see on the shy creatures. As you spot some nyxis in the undergrowth, you decide to hunt one of those wild creatures. You sneak up on a **level ${enemy.level} nyxi** and attack directly. After a short fight, the nyxi lays dead at your feet and you get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `The forest is full of life. Smaller and bigger creatures, crawling, walking and flying, enliven the forest, however you rarely see on the shy creatures. As you spot a single pangoan in the undergrowth, you decide to hunt this wild creature. You sneak up on the **level ${enemy.level} pangoan** and attack directly. After an intense fight, the pangoan lays dead at your feet and you get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `The forest is full of life. Smaller and bigger creatures, crawling, walking and flying, enliven the forest, however you rarely see on the shy creatures. You collect a lot of new impressions and will have good stories to tell after you get back home. `;
                        }
                        description += `After wandering through the forest for a good amount of time, you decide to get back to the airship. You will return home with a lot of new impressions and trophies found in the wild. But the journey was also exhausting and you better rest before jump into the next adventure.`;
                    }
                    else {
                        description += `You finally reach the magic forest. You feel the power of soulstone in the air and something in you resists to go deeper into the forest. But you are curious and watch carefully the nature spectacle around you as you get deeper into the forest. `;
                        if (enemy.unit === "Nyxi") {
                            description += `The forest is full of life. Smaller and bigger creatures, crawling, walking and flying, enliven the forest, however you rarely see on the shy creatures. As you spot some nyxis in the undergrowth, you decide to hunt one of those wild creatures. You sneak up on a **level ${enemy.level} nyxi** and attack directly. But the nyxi is stronger than expected and faster than you could think of, you lay wounded in the undergrowth. The nyxi loses interest and leaves you alone to die. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the forest ground.`;
                        }
                        else {
                            description += `The forest is full of life. Smaller and bigger creatures, crawling, walking and flying, enliven the forest, however you rarely see on the shy creatures. As you spot a single pangoan in the undergrowth, you decide to hunt this wild creature. You sneak up on the **level ${enemy.level} pangoan** and attack directly. But the pangoan is stronger than expected and faster than you could think of, you lay wounded in the undergrowth. The pangoan loses interest and leaves you alone to die. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the forest ground.`;
                        }
                    }
                    break;
            }
            break;
        case "Mysterious Wasteland":
            switch (stage) {
                case 1:
                    if (success) {
                        description += `It's a long flight with your airship to the mysterious wasteland island. You land on an abandoned place in the middle of the wasteland. `;
                        if (enemy) {
                            if (enemy.unit === "Pangoan") {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, you defeat the pangoan and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, you defeat the ranax and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. After hours of exploration, you gathered a lot of stone samples and some vegetation, but you found no wildlife. `;

                        }
                    }
                    else {
                        description += `It's a long flight with your airship to the mysterious wasteland island. You land on an abandoned place in the middle of the wasteland. `;
                        if (enemy.unit === "Pangoan") {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, the pangoan defeats you! A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, the ranax defeats you!. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
                case 2:
                    if (success) {
                        description += `You continue your journey through the island. `;
                        if (enemy) {
                            if (enemy.unit === "Pangoan") {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, you defeat the pangoan and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, you defeat the ranax and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. After hours of exploration, you gathered a lot of stone samples and some vegetation, but you found no wildlife. `;
                        }
                    }
                    else {
                        description += `You continue your journey through the island. `;
                        if (enemy.unit === "Pangoan") {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, the pangoan defeats you! A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, the ranax defeats you!. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
                case 3:
                    if (success) {
                        description += `You continue your journey through the island. `;
                        if (enemy) {
                            if (enemy.unit === "Pangoan") {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, you defeat the pangoan and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, you defeat the ranax and gets rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. After hours of exploration, you gathered a lot of stone samples and some vegetation, but you found no wildlife. `;
                        }
                    }
                    else {
                        description += `You continue your journey through the island. `;
                        if (enemy.unit === "Pangoan") {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild pangoans and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} pangoan**. After a intense fight, the pangoan defeats you! A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `The wasteland is hot and dreary, but you keep traveling through it. behind a small hill, you can spot some wild ranax and decide to hunt one. A moment later, you are face-to-face with a huge **level ${enemy.level} ranax**. After a intense fight, the ranax defeats you!. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
            }
            break;
        case "Dark Desert":
            switch (stage) {
                case 1:
                    if (success) {
                        description += "It's a very long flight to the far away dark desert island. The island is mainly undiscovered and very dangerous. You walk carefully on the hot ash fields and looking around with every sound you hear. ";
                        if (enemy) {
                            if (enemy.unit === "Ranax") {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. You have a lot of time in the loneliness of the ash fields to study the nature of soulstone. You notice that the soulstone concentration is much higher here than in the outer islands and you can feel the power undernath the surface.`;

                        }
                    }
                    else {
                        description += "It's a very long flight to the far away dark desert island. The island is mainly undiscovered and very dangerous. You walk carefully on the hot ash fields and looking around with every sound you hear. ";
                        if (enemy.unit === "Ranax") {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly and wins with his strong attack against you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly and the pure power of this creature of soulstone is too much for you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
                case 2:
                    if (success) {
                        description += "You continue your journey through the ash fields. ";
                        if (enemy) {
                            if (enemy.unit === "Ranax") {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. You have a lot of time in the loneliness of the ash fields to study the nature of soulstone. You notice that the soulstone concentration is much higher here than in the outer islands and you can feel the power undernath the surface.`;

                        }
                    }
                    else {
                        description += "You continue your journey through the ash fields. ";
                        if (enemy.unit === "Ranax") {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly and wins with his strong attack against you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly and the pure power of this creature of soulstone is too much for you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
                case 3:
                    if (success) {
                        description += "You continue your journey through the ash fields. ";
                        if (enemy) {
                            if (enemy.unit === "Ranax") {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                            else {
                                description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly but at the end, you are stronger and win the fight. You get rewarded with ${combatXp} xp and ${combatSoulstone} soulstone. `;
                            }
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. You have a lot of time in the loneliness of the ash fields to study the nature of soulstone. You notice that the soulstone concentration is much higher here than in the outer islands and you can feel the power undernath the surface.`;

                        }
                    }
                    else {
                        description += "You continue your journey through the ash fields. ";
                        if (enemy.unit === "Ranax") {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by an dangerous wild ranax! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} ranax**. The ranax fights relentlessly and wins with his strong attack against you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground. `;
                        }
                        else {
                            description += `After travelling through the region, you begin to see the beauty of this rough, abandoned but still impressive nature. But only a short moment of inattention was enough and you get chased by a mighty athlas! As you have no place to hide, you decide to try your luck and fight the **level ${enemy.level} athlas**. The athlas fights relentlessly and the pure power of this creature of soulstone is too much for you. A coldness rises and the last thing you hear before getting **unconscious** are footsteps on the ground.`;
                        }
                    }
                    break;
            }
            break;
        case "COI":
            description += "Noone returns from this place alive";
            break;
    }
    return description;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDMPermission(false)
        .setDescription('Start a quest and get rewards'),

    async execute(interaction) {

        try {
            var user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
        }
        catch {
            console.log(`user ${interaction.user.id} not found!`);
            return;
        }
        //messageCollector
        const reportFilter = (int) => {
            if (int.user.id === interaction.user.id) {
                if (int.customId === "next") {
                    return true;
                }
                else {
                    return;
                }
            }
            return int.reply({ content: `You can't use this button!`, ephemeral: true });
        };
        const selectionFilter = (int) => {
            if (int.user.id === interaction.user.id) {
                const x = Number(int.customId);
                if (Number.isInteger(x) && x < 3 && x >= 0) {
                    return true;
                }
                else {
                    return;
                }
            }
            return int.reply({ content: `You can't use this button!`, ephemeral: true });
        };
        switch (user.status) {
            case 'idle':
                //start a new quest
                await interaction.deferReply();
                if (user.quest.length === 1) {
                    //old quest not yet deleted
                    console.log(`Something wrong with the quest ${user.quest[0]}!`);
                    user.quest = [];
                }
                if (user.quest.length === 0) {
                    //create three quest options
                    user.quest = await createQuests(user);
                    await user.save();
                    user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
                }
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId("0")
                            .setLabel(`${user.quest[0].title}`)
                            .setStyle('SUCCESS'),

                        new MessageButton()
                            .setCustomId("1")
                            .setLabel(`${user.quest[1].title}`)
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId("2")
                            .setLabel(`${user.quest[2].title}`)
                            .setStyle('SUCCESS'),
                    );
                //create selection embedded message
                const embed = await createSelectionEmbed(user);
                await interaction.editReply({ embeds: embed, components: [row] });

                const questSelectionCollector = interaction.channel.createMessageComponentCollector({
                    filter: selectionFilter,
                    time: 120000,
                    max: 1
                });
                questSelectionCollector.on('collect', async i => {
                    try{
                        await i.deferUpdate();
                    }
                    catch (err){
                        console.error(err);
                    }
                    const chosenQuest = Number(i.customId);
                    try {
                        if (Number.isInteger(chosenQuest)) {
                            questSelectionCollector.stop();
                            //delete the other quests
                            user.quest = [user.quest[chosenQuest]];
                            //set status and status time
                            user.status = "atQuest";
                            user.status_time = Date.now() + user.quest[0].duration * 1000;
                            //reply
                            await i.editReply({ content: `You have chosen the quest **'${user.quest[0].title}'**. Good luck on your quest!\n*Type '/quest' to see your progress and get rewarded after the quest finished.*` });
                            await interaction.editReply({ components: [] });
                            await user.save();
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                });
                break;

            case 'atQuest':
                //show remaining time
                if (user.quest.length === 0) {
                    //no quest selected
                    await interaction.reply({ content: `No quest found, your are now idle. Type '/quest' to start a new quest.` });
                    user.status = "idle";
                    await user.save();
                    return;
                }
                if (user.quest.length > 1) {
                    //more than one quest selected
                    await interaction.reply({ content: `Something wrong with the quests. Your quest gets resetet. Start a new quest with '/quest'.` });
                    user.status = "idle";
                    user.quest = [];
                    await user.save();
                    return;
                }
                await interaction.reply({ content: `You are currently on the quest **${user.quest[0].title}**.\nRemaining time: **${readableTime(user.status_time - Date.now())}**` });
                return;
            case 'endQuest':
                if (user.status_time > Date.now() && user.quest.length === 1) {
                    user.status = "atQuest";
                    await user.save();
                    await interaction.reply({ content: `The quest **${user.quest[0].title}** is still ongoing! Come back in **${readableTime(user.status_time - Date.now())}**.` });
                    return;
                }
                if (user.quest.length != 1) {
                    user.status = "idle";
                    await user.save();
                    await interaction.reply({ content: `No quest found. Type '/quest' to start a new quest.` });
                    return;
                }
                //calculate fight
                let combatStage = 0;
                let success = true;
                const rewards = [];
                const stageDescriptions = []
                let healthBeforeQuest = user.unit.current_health;
                const embedReport = [] //store embeds of the quest report per stage

                while (combatStage < 3 && success) {
                    //iterate through the three stages
                    combatStage++;
                    let stageEnemy = user.quest[0].enemies.find(x => x.stage === combatStage);
                    let userLvl = getUnitLevel(user.unit.xp);
                    //base rewards per stage
                    let baseSoulstone = Math.round((soulstoneMultiplier * (user.quest[0].duration / (durationPeriod + minDuration) * user.quest[0].difficulty)) / 3);
                    let baseXp = Math.round((xpMultiplier * Math.pow(1.1, userLvl)) / 3);
                    let stageRewards = { baseSoulstone: baseSoulstone, baseXp: baseXp, combatSoulstone: 0, combatXp: 0, Collectible: "", success: true };

                    const currentQuest = await Quest.findOne({ title: user.quest[0].title }).exec();
                    let combatReport = {};
                    if (stageEnemy) {
                        //enemy at this stage
                        combatReport = await fightSimulator(user, stageEnemy);
                        user.unit.current_health = Math.round(combatReport.currentHealth);

                        if (!combatReport.success) {
                            //user lost fight
                            success = false;
                            stageRewards.success = false;
                            user.status = "unconscious";
                            user.status_time = Date.now() + 20 * 3600 * 1000;
                        }
                        else {
                            //get reward for this stage
                            var combatRewards = getRewards(user, combatStage);
                            stageRewards.combatSoulstone = combatRewards.soulstone;
                            stageRewards.combatXp = combatRewards.xp;
                            //Collectible reward
                            questType = currentQuest.type;
                            let CollectibleChance = 1;
                            if (combatStage === 3) {
                                //check for Collectible
                                switch (questType) {
                                    case "treasure hunter":
                                        CollectibleChance = 1;
                                        break;
                                    case "exploration":
                                        CollectibleChance = 0.5;
                                        break;
                                    case "combat":
                                        CollectibleChance = 0.25;
                                        break;
                                }
                                let uncommonChance = Math.max(0, uncommonCollectibleChance * CollectibleChance * (user.quest.difficulty - 1) * (user.quest.duration / (durationPeriod + minDuration) + 1));
                                let CollectibleTier = 0;
                                if (Math.random() < uncommonChance) {
                                    console.log(`Collectible t1`)
                                    CollectibleTier = 1;
                                    if (Math.random() < rareCollectibleChance) {
                                        console.log(`Collectible t2`)
                                        CollectibleTier = 2
                                        if (Math.random() < legendaryCollectibleChance) {
                                            console.log(`Collectible t3`)
                                            CollectibleTier = 3;
                                        }
                                    }
                                }
                                if (CollectibleTier) {
                                    //find random Collectible
                                    const Collectibles = await Item.findMany({ consumable: false, effect: CollectibleTier }).exec();
                                    for (let item in user.inventory) {
                                        Collectibles.forEach(Collectible => {
                                            if (Collectible.name === item.item_name) {
                                                //remove Collectibles that are already in players posession
                                                Collectibles = Collectibles.filter(a => a.name != Collectible.name);
                                            }
                                        });
                                    }
                                    const CollectibleCounter = Collectibles.length;
                                    const random = Math.floor(Math.random() * CollectibleCounter);
                                    const rewardedCollectible = Collectibles[random];
                                    stageRewards.Collectible = rewardedCollectible;
                                    //add Collectible to inventory
                                    user.inventory.push({
                                        item_name: rewardedCollectible.name,
                                        amount: 1,
                                        consumable: false
                                    })
                                }
                                //TODO: chance of getting one item in stage 3. Value of item depends on difficulty, length and player level.

                            }
                        }
                        //add reward of this stage
                    }
                    rewards.push(stageRewards);
                    //create description
                    let description = { stage: combatStage, text: "", success: success };
                    description.text = createDescription(user, currentQuest, combatStage, stageEnemy, success, rewards);
                    stageDescriptions.push(description);
                    //create embed
                    const stageEmbed = createQuestReportEmbed(user, stageDescriptions, combatReport, rewards, combatStage)
                    embedReport.push(stageEmbed);

                }
                const summaryEmbed = createReportSummaryEmbed(user, rewards);
                //reset quest and status and save rewards
                user.quest = [];
                if (user.status === "endQuest") {
                    user.status = "idle";
                }
                const xpBefore = user.unit.xp;
                let totalXpReward = 0;
                let totalSoulstoneReward = 0;
                for (stage of rewards) {
                    totalSoulstoneReward += stage.baseSoulstone + stage.combatSoulstone;
                    totalXpReward += stage.baseXp + stage.combatXp;
                }
                user.unit.xp += totalXpReward;
                user.soulstones += totalSoulstoneReward;
                await user.save();

                //send reply
                let stageCounter = 1;
                const reportRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('next')
                            .setLabel('➡️')
                            .setStyle('SUCCESS')
                    );

                await interaction.reply({ embeds: embedReport[stageCounter - 1], components: [reportRow] });
                const reportCollector = interaction.channel.createMessageComponentCollector({
                    filter: reportFilter
                });
                reportCollector.on('collect', async i => {
                    stageCounter++;
                    try {
                        i.deferUpdate();
                    }
                    catch (err) {
                        console.error(`can't defer interaction at Report Collector\n${err}`);
                    }
                    if (stageCounter <= embedReport.length) {
                        try {
                            await interaction.editReply({ embeds: embedReport[stageCounter - 1], components: [reportRow] });
                        }
                        catch (err) {
                            console.error(`Can't get to next quest report stage with stageCounter = ${stageCounter}\n${err}`);
                        }
                    }
                    else {
                        //show report summary
                        try {
                            await interaction.editReply({ embeds: summaryEmbed, components: [] });
                        }
                        catch (err) {
                            console.error(`Can't show report summary\n${err}`);
                        }
                    }
                });
                await levelUp(user, xpBefore, interaction.channel);
                break;
            default:
                //quest not available
                try {
                    await interaction.reply({ content: `You are ${user.status} and can't do a quest at the moment. Come back when you are idle.` });
                    return;
                }
                catch (err) {
                    console.error(err);
                }
        }
    }, readableTime
};
