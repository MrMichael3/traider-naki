const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const Quest = require('./../schemas/Quest.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unitData = require('./../unitStats.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const emojis = require('./../emojis.json');
const { getUnitLevel } = require('./../controller/unitLevel.js');


const minDuration = 3600 //minimum duration of quests in seconds
const durationPeriod = 36000 //period of quest duration in seconds


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
            //make first quest of difficulty 1
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
                durationRegionFactor = 0.5;
                break;
            case "Mysterious Wasteland":
                durationRegionFactor = 0.7;
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
        const playerPower = user.unit.max_health * (user.unit.min_attack + user.unit.max_attack) / 2;
        const enemyPower = playerPower * (Math.floor(Math.random() * 15 + 16) / 100 * factor * diff); //easy quest: 12%-22.5% of playerPower, hard quest: 72%-135% of pp
        let stage = 1;
        //calculate how enemy power is distributed on three stages
        const powerPerStage = [];
        powerPerStage.push(Math.floor(Math.random() * 21) / 100 * enemyPower);
        powerPerStage.push(Math.floor(Math.random() * 51) / 100 * enemyPower);
        powerPerStage.push(enemyPower - powerPerStage[0] - powerPerStage[1]);
        console.log(`enemy power\nstage 1: ${Math.round(powerPerStage[0])}\nstage 2: ${Math.round(powerPerStage[1])}\nstage 3: ${Math.round(powerPerStage[2])}\n`);
        let possibleEnemies = [];
        switch (quest.region) {
            case "Magic Marsh":
                possibleEnemies = ["Nyxi", "Nyxi", "Nyxi", "Pangoan"];
                break;
            case "Mysterious Wasteland":
                possibleEnemies = ["Nyxi", "Ranax", "Pangoan"];

                break;
            case "Dark Desert":
                possibleEnemies = ["Ranax", "Ranax", "Athlas"];

                break;
            case "Crater of Immortality":
                possibleEnemies = ["Athlas", "Athlas"];

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
            let unitLvl = Math.max(0, Math.floor(Math.log(powerPerStage[stage - 1] / (enemy.health * baseAttack)) / (2 * Math.log(1.2)) + 0.2) + 1); //round up if >= xx.8
            //const unitLvl = Math.max(0, Math.floor(Math.log(powerPerStage[stage - 1] / (enemy.health * baseAttack)) / (2 * Math.log(1.2))) + 1);
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
        console.log(`units: ${JSON.stringify(createQuest.enemies)}\n`);
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
        let possibleEnemy = "";
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
        if (user.quest[counter].enemies.length != 0) {
            //take the first enemy that appears on the quest as 'possible Enemy'
            possibleEnemy = user.quest[counter].enemies[0].unit;
        }
        let q = await Quest.findOne({ title: user.quest[counter].title }).exec();
        region = q.region;
        description = q.description;
        questType = q.type;
        questStats.push({ diffStars: diffStars, possibleEnemy: possibleEnemy, description: description, region: region, questType: questType });
        counter++;
    }
    //create embedded message
    const selectionEmbed = new MessageEmbed()
        .setTitle(`Choose a Quest`)
        .setDescription(`You can choose between three quests of different difficulty (${emojis.battlepoint}) and duration.`)
        .addFields(
            { name: `${user.quest[0].title}\n${questStats[0].diffStars}`, value: `${questStats[0].description}\n\n**Duration:** ${readableTime(user.quest[0].duration * 1000)}\n **Type:** ${questStats[0].questType}\n**Region:** ${questStats[0].region}\n**Possible enemy:** ${questStats[0].possibleEnemy}`, inline: true },
            { name: `${user.quest[1].title}\n${questStats[1].diffStars}`, value: `${questStats[1].description}\n\n**Duration:** ${readableTime(user.quest[1].duration * 1000)}\n **Type:** ${questStats[1].questType}\n**Region:** ${questStats[1].region}\n**Possible enemy:** ${questStats[1].possibleEnemy}`, inline: true },
            { name: `${user.quest[2].title}\n${questStats[2].diffStars}`, value: `${questStats[2].description}\n\n**Duration:** ${readableTime(user.quest[2].duration * 1000)}\n **Type:** ${questStats[2].questType}\n**Region:** ${questStats[2].region}\n**Possible enemy:** ${questStats[2].possibleEnemy}`, inline: true }
        );
    embeds.push(selectionEmbed);
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

    /*
        let healthOne = Math.round(baseEnemy.health * Math.pow(1.2, 0));
        let attackOne = (Math.round((baseEnemy.maxAttack * Math.pow(1.2, 0) * 100) / 100 + (Math.round(baseEnemy.minAttack * Math.pow(1.2, 0) * 100) / 100))) / 2;
        let strengthOne = healthOne * attackOne;
        console.log(`level 1: health ${healthOne} * attack ${attackOne} = strength ${strengthOne}`);
        let healthTwo = Math.round(baseEnemy.health * Math.pow(1.2, 1));
        let attackTwo = (Math.round(baseEnemy.maxAttack * Math.pow(1.2, 1) * 100) / 100 + Math.round(baseEnemy.minAttack * Math.pow(1.2, 1) * 100) / 100) / 2;
        let strengthTwo = healthTwo * attackTwo;
        let healthThree = Math.round(baseEnemy.health * Math.pow(1.2, 2));
        let attackThree = (Math.round(baseEnemy.maxAttack * Math.pow(1.2, 2) * 100) / 100 + Math.round(baseEnemy.minAttack * Math.pow(1.2, 2) * 100) / 100) / 2;
        let strengthThree = healthThree * attackThree;
    
        console.log(`compare strength:\nlevel 1: ${strengthOne}\nlevel 2: ${strengthTwo}\nlevel 3: ${strengthThree}`);
    */

    let userHealth = user.unit.current_health;
    let enemyHealth = Math.round(baseEnemy.health * Math.pow(1.2, enemy.level - 1));
    let enemyAttack = [Math.round(baseEnemy.minAttack * Math.pow(1.2, enemy.level - 1) * 100) / 100, Math.round(baseEnemy.maxAttack * Math.pow(1.2, enemy.level - 1) * 100) / 100];
    let playerAttacks = Math.round(Math.random());
    let c = 0;
    let fightOnGoing = true;
    console.log(`stat comparison\n user health: ${userHealth}, attack: ${(user.unit.max_attack + user.unit.min_attack) / 2} = strength: ${userHealth * (user.unit.max_attack + user.unit.min_attack) / 2}\n enemy health: ${enemyHealth}, attack: ${(enemyAttack[1] + enemyAttack[0]) / 2} = strength: ${enemyHealth * (enemyAttack[1] + enemyAttack[0]) / 2}`)
    while (fightOnGoing) {
        c++;
        //fight until one unit dies
        let attack = 0;
        if (playerAttacks) {
            //player attacks
            console.log(`${c}: Player attacks!`);
            playerAttacks = 0;
            attack = Math.floor((Math.random() * (user.unit.max_attack - user.unit.min_attack) + user.unit.min_attack) * 100) / 100;
            //TODO: Increase attack if effective
            console.log(`Player attacks with ${attack} atk`);
            enemyHealth = Math.max(enemyHealth - attack, 0);
            console.log(`enemy health: ${enemyHealth}`);
            if (enemyHealth === 0) {
                //player wins the fight
                console.log(`Players wins!`);
                result.success = true;
                result.currentHealth = userHealth;
                fightOnGoing = false;
                //TODO: WIN
            }
        }
        else {
            //enemy attacks
            console.log(`${c}: enemy atacks`);
            playerAttacks = 1;
            attack = Math.floor((Math.random() * (enemyAttack[1] - enemyAttack[0]) + enemyAttack[0]) * 100) / 100;
            //TODO: Increase attack if effective
            console.log(`Enemy attacks with ${attack} atk`);
            userHealth = Math.max(userHealth - attack, 0);
            console.log(`player health: ${userHealth}`);
            if (userHealth === 0) {
                //enemy wins the fight
                console.log(`enemy wins`);
                result.success = false;
                result.currentHealth = userHealth;
                fightOnGoing = false;
            }
        }
    }

    return result;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Start a quest and get rewards'),

    async execute(interaction) {

        try {
            var user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
        }
        catch {
            console.log(`user ${interaction.user.id} not found!`);
            return;
        }
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

                //messageCollector
                const filter = (int) => {
                    if (int.user.id === interaction.user.id) {
                        return true;
                    }
                    return int.reply({ content: `You can't use this button!` });
                };
                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 120000
                });
                collector.on('collect', async i => {
                    const chosenQuest = Number(i.customId);
                    console.log(`chose Quest ${chosenQuest}`);
                    //delete the other quests
                    user.quest = [user.quest[chosenQuest]];
                    //set status and status time
                    user.status = "atQuest";
                    user.status_time = Date.now() + user.quest[0].duration * 1000;
                    //reply
                    await i.reply({ content: `You have chosen the quest **'${user.quest[0].title}'**. Good luck on your quest!\n*Type '/quest' to see your progress and get rewarded after the quest finished.*` });
                    await user.save();
                    collector.stop();

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
                    console.log("Quest is still ongoing!");
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
                //get rewards
                let combatStage = 0;
                let success = true;
                while (combatStage < 3 && success) {
                    //iterate through the three stages
                    combatStage++;
                    let stageEnemy = user.quest[0].enemies.find(x => x.stage === combatStage);
                    if (!stageEnemy) {
                        //no enemy at this stage
                    }
                    else {
                        //enemy at this stage
                        console.log(`stage enemy: ${stageEnemy.unit} ${stageEnemy.level} at stage ${combatStage}`);
                        const combatReport = await fightSimulator(user, stageEnemy);
                        if (!combatReport.success) {
                            //user lost fight
                            success = false;
                            user.status = "unconscious";
                            user.status_time = Date.now() + 20 * 3600 * 1000;
                        }
                        //set health
                        user.unit.current_health = Math.round(combatReport.currentHealth);

                        if (combatReport.success) {
                            //get reward for this stage

                        }
                    }

                }
                //create text

                //reset quest and status
                user.quest = [];
                await user.save();

                //send reply
                await interaction.reply({ content: `Your quest ended` });
                break;
            default:
                //quest not available
                console.log('default');
                interaction.reply({ content: `You are ${user.status} and can't do a quest at the moment. Come back when you are idle.` });
                return;
        }



    }
};