const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, ButtonInteraction, ComponentType } = require('discord.js');
const User = require('./../User.js');
const mongoose = require('mongoose');
const { getUnitLevel, levelUp } = require('./../controller/unitLevel.js');

const trainingDuration = 1000 * 3600 * 6; //6hours
const trainingBaseXp = 40;
const trainingMultiplier = 1.1;


async function trainingReward(user, interrupted = false) {
    //get rewarded for training and change status
    if (user.status != "atTraining") {
        console.log(`User ${user.username} is not at Training!`);
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
module.exports = {
    data: new SlashCommandBuilder()
        .setName('training')
        .setDescription('A save way to gain experience. Training last 6 hours.'),
    async execute(interaction) {
        //check user status
        const user = await User.findOne({ discord_id: interaction.user.id }).exec();
        const status = user.status;

        if (status === "atTraining") {
            //end training early
            var remainingTime = user.status_time;
            remainingTime = (remainingTime - Date.now()) * 1000;
            if (remainingTime < 120) {
                //can't end training at last two minutes
                interaction.reply({ content: `Your training ends in ${remainingTime} seconds` });
                return;
            }
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('yes')
                        .setLabel('YES')
                        .setStyle('SUCCESS'),

                    new MessageButton()
                        .setCustomId('no')
                        .setLabel('NO')
                        .setStyle('DANGER')
                );
            await interaction.reply({
                content: `Your training lasts until ${new Date(user.status_time).toISOString().replace(/T/, ' ').replace(/\..+/, '')}. Do you want to end training early? \n Caution: You get less experience by ending training early!`,
                components: [row]
            });
            //collector for button interaction
            const filter = (int) => {
                if (int.user.id === interaction.user.id) {
                    return true;
                }
                return int.reply({ content: `You can't use this button!` });
            };
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 60000,
                max: 1
            });
            collector.on('end', async (ButtonInteraction) => {
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
