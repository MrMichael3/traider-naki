const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const Quest = require('./../schemas/Quest.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unitData = require('./../unitStats.json');

const minDuration = 3600 //minimum duration of quests in seconds


function readableTime(ms) {
    let sec = ms * 1000;
    let time = "";
    if (sec > 3600 * 24) {
        //days
        days = Math.floor(sec / (3600 * 24));
        if (days === 1) {
            time = time + days + " day ";
        }
        else {
            time = time + days + " days ";
        }
        sec = sec - (days * 3600 * 24);
    }
    if (sec > 3600) {
        //hours
        hours = Math.floor(sec / 3600);
        if (hours === 1) {
            time = time + hours + " hour ";
        }
        else {
            time = time + hours + " hours ";
        }
        time = time - (hours * 3600);
    }
    if (sec > 60) {
        //minutes
        min = Math.floor(sec / 60);
        if (min === 1) {
            time = time + min + " min ";
        }
        else {
            time = time + min + " mins ";
        }
    }
    time = time + sec + "sec";
    return time;

}

async function createQuests(user) {
    //create three quests
    const quests = [];
    let counter = 0;
    while (counter < 3) {
        counter++;
        //select a random quest
        const c = await Quest.count().exec();
        const random = Math.floor(Math.random() * c);
        const quest = await Quest.findOne().skip(random).exec();
        let createQuest = {};
        createQuest.enemies = [];
        createQuest.title = quest.title;
        //difficulty
        const diff = Math.floor(Math.random() * 3) + 1;
        if (quest.type === "treasure hunt") {
            //treasure hunt must be difficulty 2 or 3
            diff = Math.min(diff + 1, 3);
        }
        createQuest.difficulty = diff;
        //duration
        const duration = (Math.floor(Math.random() * 36000) + minDuration) * diff; //quest duration at maximum 33h
        createQuest.duration = duration;
        //enemies
        const enemies = [];
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
        let possibleEnemies = [];
        switch (quest.region) {
            case "Magic Marsh":
                possibleEnemies = ["Nyxi", "Nyxi", "Nyxi", "Pangoan"];
                break;
            case "Mysterious Wasteland":
                possibleEnemies = ["Nyxi","Ranax", "Pangoan"];

                break;
            case "Dark Desert":
                possibleEnemies = ["Ranax", "Ranax","Athlas"];

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
            const unitLvl = Math.max(0, Math.round(Math.log(powerPerStage[stage - 1] / (enemy.health * baseAttack)) / Math.log(1.2)));
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
                console.log('idle');
                await interaction.deferReply();
                if (user.quest.length === 1) {
                    //old quest not yet deleted
                    console.log(`Something wrong with the quest ${user.quest[0]}!`);
                    user.quest = [];
                }
                if (user.quest.length === 0) {
                    //create three quest options
                    user.quest = await createQuests(user);
                    //create embed message
                    

                }
                //create selection embedded message
                await interaction.editReply({ content: `Thanks for waiting` });
                user.status = "atQuest";
                user.status_time = Date.now() + 3600 * 2;
                await user.save();
                break;
            case 'atQuest':
                //show remaining time
                console.log('atQuest');

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
                await interaction.reply({ content: `You are currently on the quest **${user.quest[0]}**.\nRemaining time: **${readableTime(user.status_time)}**` });
                return;
            case 'endQuest':
                //get rewarded
                console.log('endQuest');
                user.quest = [];
                user.status = "idle";
                await user.save();
                await interaction.reply({ content: `You quest ended` });
                break;
            default:
                //quest not available
                console.log('default');
                interaction.reply({ content: `You are ${user.status} and can't do a quest at the moment. Come back when you are idle.` });
                return;
        }



    }
};