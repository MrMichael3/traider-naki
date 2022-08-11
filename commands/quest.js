const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const Quest = require('./../schemas/Quest.js');
const { SlashCommandBuilder } = require('@discordjs/builders');


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
//select a random quest
const count = await Quest.count().exec();
const r = Math.floor(Math.random()*count);
const quest = await Quest.findOne().skip(r).exec();
console.log(`Quest: ${quest.title}`);

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
                    user.quest = createQuests(user);

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
                break;
            default:
                //quest not available
                console.log('default');
                interaction.reply({ content: `You are ${user.status} and can't do a quest at the moment. Come back when you are idle.` });
                return;
        }



    }
};