const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton } = require('discord.js');
const User = require('./../User.js');
const emojis  = require('./../emojis.json');


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

        const targetFilter = (int) => {
            console.log(`filter for target id`);
            if (int.user.id === target.discord_id) {
                return true;
            }
            return int.reply({ content: `You can't use this button!`, ephemeral: true });
        };
        const soulstoneFilter = (int) => {
            console.log(`filter for soulstone selection`);
            if (int.user.id === interaction.user.id) {
                return true;
            }
            return int.reply({ content: `You can't use this button!`, ephemeral: true });
        };
        //reply with buttons to select amount of soulstone
        await interaction.deferReply();
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId("100")
                    .setLabel(`100 ${emojis.soulstone}`)
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId("500")
                    .setLabel(`500 ${emojis.soulstone}`)
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId("1500")
                    .setLabel(`1500 ${emojis.soulstone}`)
                    .setStyle('PRIMARY')
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
        if (challenger.status != 'idle' && target.status != 'idle') {
            await interaction.editReply({ content: `In order to challenge ${target.username} both of you must be idle!` });
            return;
        }
        await interaction.editReply({ content: `Choose the amount of soulstone you want to bet.`, components: [row] })
        const betCollector = interaction.channel.createMessageComponentCollector({
            filter: soulstoneFilter,
            time: 120000
        });
        betCollector.on('collect', async i => {
            betCollector.stop();
            console.log(`betcollector:)`)
            await i.deferReply();
            await interaction.editReply({ components: [] });
            try {
                const chosenBet = Number(i.customId);
                if (!Number.isInteger(chosenBet)) {
                    await i.editReply({ content: `Something went wrong with the soulstone selection` });
                    return;
                }
                //check if both user have enough soulstone
                if (challenger.soulstones < chosenBet || target.soulstones < chosenBet) {
                    console.log(`not enough soulstones`);
                    await i.editReply({ content: `You or your enemy does not have enough soulstones ${emojis.soulstone}!` });
                    return;
                }
                const challengeRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`yes`)
                            .setLabel(`Yes`)
                            .setStyle(`PRIMARY`),
                        new MessageButton()
                            .setCustomId(`no`)
                            .setLabel(`No`)
                            .setStyle(`PRIMARY`)
                    );
                await i.editReply({ content: `**PVP CHALLENGE**\n<@${target.discord_id}> is challenged by ${challenger.username}. Do you want to accept the challenge and fight against ${challenger.username}?\n*You must be idle to accept the challenge*`, components: [challengeRow] });
                const answerCollector = interaction.channel.createMessageComponentCollector({
                    filter: targetFilter
                });
                answerCollector.on('collect', async int => {
                    console.log(`answer collector`);
                    answerCollector.stop();
                    await int.deferReply();
                    try {
                        await i.editReply({components: []});
                        if (int.customId === "no") {
                            //deny challenge
                            await int.editReply({ content: `${target.username} denied the challenge of ${challenger.username}` });
                            return;
                        }
                        //check if both users are still idle and have enough soulstone
                        if(challenger.status !='idle' || target.status !='idle'){
                            await int.editReply({content:`Both opponents must be idle to fight against each other!`});
                            return;
                        }
                        if(challenger.soulstones < chosenBet || target.soulstones < chosenBet){
                            await int.editReply({content: `Both opponents must have equal or more than ${chosenBet}${emojis.soulstone}!`});
                            return;
                        }
                        await int.editReply({content:`${target.username} accepted the challenge of ${challenger.username}. Let the battle begin!`});
                    }
                    catch (err) {
                        console.error(err);
                        return;
                    }
                    //follow up int with battle
                });
            }
            catch (err) {
                console.error(err);
            }
        });
        //fight if enemy accepted and both are able to fight

        //
    }
}