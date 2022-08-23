const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, ButtonInteraction, ComponentType } = require('discord.js');
const User = require('./../User.js');
const mongoose = require('mongoose');
const { getUnitLevel, levelUp } = require('./../controller/unitLevel.js');

const trainingDuration = 1000 * 3600 * 6; //6hours
const trainingBaseXp = 40;
const trainingMultiplier = 1.1;

//Training: the user trains for 6 hours to get a fixed amount of xp based on his level.
async function trainingReward(user, interrupted = false) {
    //get rewarded for training and change status
    if (user.status != "atTraining") {
        return;
    }
    user.status = "idle";
    level = getUnitLevel(user.unit.xp);
    var experienceReward = trainingBaseXp * Math.pow(trainingMultiplier, level);
    if (interrupted) {
        percentageOfTrainingDone = Math.round((1 - ((user.status_time - Date.now()) / trainingDuration)) * 100) / 100;
        experienceReward = experienceReward * percentageOfTrainingDone / 2;
    }
    user.unit.xp = Math.round(user.unit.xp + experienceReward);
    try {
        await user.save();
        return Math.round(experienceReward);
    }
    catch {
        console.log("failed to save training rewards!");
    }
}

function remainingTime(d) {
    var time = "";
    if (d > 3600) {
        //time left greater than one hour
        const hours = Math.floor(d / 3600);
        d = d - (hours * 3600);
        time += `${hours} hours `;
    }
    if (d > 60) {
        //time left greater than a minute
        const minutes = Math.floor(d / 60);
        d = d - (minutes * 60);
        time += `${minutes} min `;
    }
    if (d > 0) {
        //time left greater than a second
        const seconds = d;
        d = d - (seconds);
        time += `${seconds} seconds`;
    }
    return time;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('training')
        .setDMPermission(false)
        .setDescription('A save way to gain experience. Training last 6 hours.'),
    async execute(interaction) {
        //check user status
        const user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId }).exec();
        if (!user) {
            await interaction.reply({
                content: `You aren't yet in Expelsia. Type '/start' to begin your journey!`
            });
            return;
        }
        const status = user.status;

        if (status === "atTraining") {
            //end training early
            var remainTime = user.status_time;
            remainTime = Math.floor((remainTime - Date.now()) / 1000);
            if (remainTime < 120) {
                //can't end training at last two minutes
                interaction.reply({ content: `Your training ends in **${remainingTime(remainTime)}**` });
                return;
            }
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('yes')
                        .setLabel('YES')
                        .setStyle('DANGER'),

                    new MessageButton()
                        .setCustomId('no')
                        .setLabel('NO')
                        .setStyle('SECONDARY')
                );
            await interaction.reply({
                content: `Your training ends in **${remainingTime(remainTime)}**. Do you want to end training early? \n **Caution:** You get less experience by ending training early!`,
                components: [row]
            });
            //collector for button interaction
            const filter = (int) => {
                //int.deferUpdate();
                if (int)
                    if (int.user.id === interaction.user.id) {
                        return true;
                    }
                return int.reply({ content: `You can't use this button!` });
            };
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 10000,
                max: 1
            });
            const correctionCollector = interaction.channel.createMessageCollector({
                time: 10000
            });
            correctionCollector.on('collect', i => {
                if (i.type != "REPLY") {
                    collector.stop();
                }
            })

            collector.on('end', async (ButtonInteraction) => {
                try {
                    ButtonInteraction.first().deferUpdate();
                    const buttonId = ButtonInteraction.first().customId;
                    if (buttonId === "yes") {
                        //end training
                        const xpBeforeReward = user.unit.xp;
                        const rewardedXp = await trainingReward(user, true);
                        await interaction.followUp({ content: `you have finished your training and got ${rewardedXp} XP.` });
                        //check for levelUp
                        levelUp(user, xpBeforeReward, interaction.channel);
                    }
                    if (buttonId === "no") {
                        //continue training
                        await interaction.followUp({ content: `Continue training` });
                    }
                }
                catch {
                    collector.stop();
                    console.log("error with training command handler!");
                }
            });


        }
        else if (status != "idle") {
            return await interaction.reply({ content: `You can't start a training, you are currently ${status}` });
        }
        else {
            //start training
            user.status = "atTraining";
            user.status_time = Date.now() + trainingDuration;
            await user.save();
            await interaction.reply({ content: `**You have started your ${trainingDuration / (1000 * 3600)} hours training**. \n At the end of the training, you automatically gain experience. If you end the training early by repeating this command, you will get **less experience**. You can't do any quests or other activities while training!` });
        }
    },
    trainingReward
};
