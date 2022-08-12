const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const Quest = require('./../schemas/Quest.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unitData = require('./../unitStats.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const emojis = require('./../emojis.json');


const minDuration = 3600 //minimum duration of quests in seconds


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
    if (sec > 0 && ms<3600*1000) {
        sec = Math.round(sec);
        time += sec + " sec";
    }
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
        let diff = Math.floor(Math.random() * 3) + 1;
        const difficultRegions = ["Fiery Desert", "COI"];
        if (quest.type === "treasure hunt" || difficultRegions.includes(quest.region)) {
            //treasure hunt and quests in difficult regions must be difficulty 2 or 3
            if (diff === 1) {
                diff += 1;
            }
        }
        else if (counter === 1) {
            //make first quest of difficulty 1 if possible
            diff = 1;
            console.log("Come here only once!");
        }
        createQuest.difficulty = diff;
        //duration
        var duration = (Math.floor(Math.random() * 36000) + minDuration) * diff; //quest duration at maximum 33h in seconds
        duration = Math.round(duration / (60 * 30)) * (60 * 30); //duration rounded to half hours
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

async function createSelectionEmbed(user) {
    const embeds = [];
    const questStats = []; //important stats per quest
    let counter = 0;
    while (counter < 3) {
        //iterate through the three quests
        let diffStars = "";
        let possibleEnemy = "";
        let description = "";
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
        description = q.description;
        questStats.push({ diffStars: diffStars, possibleEnemy: possibleEnemy, description: description });
        counter++;
    }
    //create embedded message
    const selectionEmbed = new MessageEmbed()
        .setTitle(`Choose a Quest`)
        .setDescription(`You can choose between three quests of different difficulty (${emojis.battlepoint}) and duration.`)
        .addFields(
            { name: `${user.quest[0].title} ${questStats[0].diffStars}`, value: `${questStats[0].description}\n**Duration:** ${readableTime(user.quest[0].duration * 1000)}\n **Possible enemy:** ${questStats[0].possibleEnemy}`, inline: true },
            { name: `${user.quest[1].title} ${questStats[1].diffStars}`, value: `${questStats[1].description}\n**Duration:** ${readableTime(user.quest[1].duration * 1000)}\n **Possible enemy:** ${questStats[1].possibleEnemy}`, inline: true },
            { name: `${user.quest[2].title} ${questStats[2].diffStars}`, value: `${questStats[2].description}\n**Duration:** ${readableTime(user.quest[2].duration * 1000)}\n **Possible enemy:** ${questStats[2].possibleEnemy}`, inline: true }
        );
    embeds.push(selectionEmbed);
    return embeds;
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
                await interaction.reply({ content: `You are currently on the quest **${user.quest[0].title}**.\nRemaining time: **${readableTime(user.status_time-Date.now())}**` });
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