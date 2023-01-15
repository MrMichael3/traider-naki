const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton } = require('discord.js');
const User = require('./../schemas/User.js');
const emojis = require('./../emojis.json');

const targetFilter = (int) => {
    console.log(`filter for target id`);
    if (int.user.id === target.discord_id) {
        if (int.customId === "acceptChallenge" || int.customId === "denyChallenge") {
            return true;
        }
        else {
            return;
        }
    }
    return int.reply({ content: `You can't use this button!`, ephemeral: true });
};
const soulstoneFilter = (int) => {
    console.log(`filter for soulstone selection`);
    if (int.user.id === interaction.user.id) {
        const x = Number(int.customId)
        if (x && x > 99) {
            return true;
        }
        else {
            return;
        }
    }
    return int.reply({ content: `You can't use this button!`, ephemeral: true });
};

async function simulateFight(interaction, playerA, playerB) {
    const results = {};
    //create an embed as follow up

    //make a 10sec counter before fight start

    //every second take one round until someone dies

    //return results
    return results;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('PvP fight against another player')
        .setDMPermission(false)
        .addUserOption(option => option
            .setName('player')
            .setDescription('player name')
            .setRequired(true))
    ,
    async execute(interaction) {

        //reply with buttons to select amount of soulstone
        try {
            await interaction.deferReply();
        }
        catch (err) {
            console.error(err);
            return;
        }
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId("100")
                    .setLabel(`100 ${emojis.soulstone}`)
                    .setStyle(ButtonStyle.Primary),
                new MessageButton()
                    .setCustomId("500")
                    .setLabel(`500 ${emojis.soulstone}`)
                    .setStyle(ButtonStyle.Primary),
                new MessageButton()
                    .setCustomId("1500")
                    .setLabel(`1500 ${emojis.soulstone}`)
                    .setStyle(ButtonStyle.Primary)
            );
        try {
            console.log(`challenger: ${interaction.user.id}\ntarget: ${interaction.options.get('player').user.id}`)
            var challenger = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
            var target = await User.findOne({ discord_id: interaction.options.get('player').user.id, guild_id: interaction.guildId })
        }
        catch (err) {
            console.error(err);
            return;
        }
        if (!challenger) {
            //user not found
            try {
                await interaction.editReply({ content: `user not found! Type **/start** if you are not already in Expelsia.` });
                return;
            }
            catch (err) {
                console.error(err);
                return;
            }
        }
        if (!target) {
            //user not found
            try {
                await interaction.editReply({ content: `Your enemy does not exist in Expelsia. Type **/leaderboard** to find possible enemies.` });
                return;
            }
            catch (err) {
                console.error(err);
                return;
            }
        }
        if (challenger.status != 'idle' && target.status != 'idle') {
            //one user not available
            try {
                await interaction.editReply({ content: `In order to challenge ${target.username} both of you must be idle!` });
                return;
            }
            catch (err) {
                console.error(err);
                return;
            }
        }
        try {
            await interaction.editReply({ content: `Choose the amount of soulstone you want to bet.`, components: [row] })
        }
        catch (err) {
            console.error(err);
        }
        const betCollector = interaction.channel.createMessageComponentCollector({
            filter: soulstoneFilter,
            time: 120000
        });
        betCollector.on('collect', async i => {
            betCollector.stop();
            console.log(`betcollector:)`)
            try {
                await i.deferReply();
                await interaction.editReply({ components: [] });
            }
            catch (err) {
                console.error(err);
                return;
            }
            const chosenBet = Number(i.customId);
            if (!Number.isInteger(chosenBet)) {
                try {
                    await i.editReply({ content: `Something went wrong with the soulstone selection` });
                }
                catch (err) {
                    console.error(err)
                }
                return;
            }
            //check if both user have enough soulstone
            if (challenger.soulstones < chosenBet || target.soulstones < chosenBet) {
                console.log(`not enough soulstones`);
                try {
                    await i.editReply({ content: `You or your enemy does not have enough soulstones ${emojis.soulstone}!` });
                }
                catch (err) {
                    console.error(err);
                }
                return;
            }
            const challengeRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId(`acceptChallenge`)
                        .setLabel(`Yes`)
                        .setStyle(`ButtonStyle.Primary`),
                    new MessageButton()
                        .setCustomId(`denyChallenge`)
                        .setLabel(`No`)
                        .setStyle(`ButtonStyle.Primary`)
                );
            try {
                await i.editReply({ content: `**PVP CHALLENGE**\n<@${target.discord_id}> is challenged by ${challenger.username}. Do you want to accept the challenge and fight against ${challenger.username}?\n*You must be idle to accept the challenge*`, components: [challengeRow] });
            }
            catch (err) {
                console.error(err);
                return;
            }
            const answerCollector = interaction.channel.createMessageComponentCollector({
                filter: targetFilter
            });
            answerCollector.on('collect', async int => {
                console.log(`answer collector`);
                answerCollector.stop();
                try {
                    await int.deferReply();
                    await i.editReply({ components: [] });
                }
                catch (err) {
                    console.error(err);
                    return;
                }
                try {
                    if (int.customId === "denyChallenge") {
                        //deny challenge
                        await int.editReply({ content: `${target.username} denied the challenge of ${challenger.username}` });
                        return;
                    }
                    //check if both users are still idle and have enough soulstone
                    if (challenger.status != 'idle' || target.status != 'idle') {
                        await int.editReply({ content: `Both opponents must be idle to fight against each other!` });
                        return;
                    }
                    if (challenger.soulstones < chosenBet || target.soulstones < chosenBet) {
                        await int.editReply({ content: `Both opponents must have equal or more than ${chosenBet}${emojis.soulstone}!` });
                        return;
                    }
                    await int.editReply({ content: `${target.username} accepted the challenge of ${challenger.username}. Let the battle begin!` });
                }
                catch (err) {
                    console.error(err);
                    return;
                }
                //start fight
                try {
                    const results = await simulateFight(int, challenger, target);
                }
                catch (err) {
                    console.error(err);
                    return;
                }
                //TODO: make a complete battle report to download

                //update both user: health, status, xp, soulstone
            });

        });

    }
}