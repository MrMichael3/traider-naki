const { SlashCommandBuilder } = require('@discordjs/builders');
const User = require('./../schemas/User.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const unitData = require('./../unitStats.json');
const emojis = require('./../emojis.json');
const druidNaki = unitData.starterUnits.find(x => x.id === 1);
const guardNaki = unitData.starterUnits.find(x => x.id === 2);
const forestSpirit = unitData.starterUnits.find(x => x.id === 3);
const elderSpirit = unitData.starterUnits.find(x => x.id === 4);
const handleNewUser = require('./../registerController');


//create embed unit descriptions
function createEmbeds() {
    // TODO: Create forward/back buttons instead of 4 embeds
    const embeds = [];
    //druid Naki
    const druidNakiEmbed = new EmbedBuilder()
        //.setColor()
        .setTitle(`${druidNaki.name} Level 1`)
        .setDescription(druidNaki.description)
        .setThumbnail("https://i.imgur.com/ZYOXfAK.png")
        .addFields(
            { name: 'health', value: `${druidNaki.health}${emojis.defensive}`, inline: true },
            { name: 'attack', value: `${druidNaki.minAttack}-${druidNaki.maxAttack}${emojis.offensive}`, inline: true },
            { name: 'strong against', value: `${findUnitIconsById(druidNaki.strongAgainst)}`, inline: true },
            { name: 'weak against', value: `${findUnitIconsById(druidNaki.weakAgainst)}`, inline: true }
        )
    embeds.push(druidNakiEmbed);

    //Guard Naki
    const guardNakiEmbed = new EmbedBuilder()
        //.setColor()
        .setTitle(`${guardNaki.name} Level 1`)
        .setDescription(guardNaki.description)
        .setThumbnail("https://i.imgur.com/M6lHdxY.png")
        .addFields(
            { name: 'health', value: `${guardNaki.health}${emojis.defensive}`, inline: true },
            { name: 'attack', value: `${guardNaki.minAttack}-${guardNaki.maxAttack}${emojis.offensive}`, inline: true },
            { name: 'strong against', value: `${findUnitIconsById(guardNaki.strongAgainst)}`, inline: true },
            { name: 'weak against', value: `${findUnitIconsById(guardNaki.weakAgainst)}`, inline: true }
        )
    embeds.push(guardNakiEmbed);

    //Forest Spirit
    const forestSpiritEmbed = new EmbedBuilder()
        //.setColor()
        .setTitle(`${forestSpirit.name} Level 1`)
        .setDescription(forestSpirit.description)
        .setThumbnail("https://i.imgur.com/vVTBl2m.png")
        .addFields(
            { name: 'health', value: `${forestSpirit.health}${emojis.defensive}`, inline: true },
            { name: 'attack', value: `${forestSpirit.minAttack}-${forestSpirit.maxAttack}${emojis.offensive}`, inline: true },
            { name: 'strong against', value: `${findUnitIconsById(forestSpirit.strongAgainst)}`, inline: true },
            { name: 'weak against', value: `${findUnitIconsById(forestSpirit.weakAgainst)}`, inline: true }
        )
    embeds.push(forestSpiritEmbed);

    //Elder Spirit
    const elderSpiritEmbed = new EmbedBuilder()
        //.setColor()
        .setTitle(`${elderSpirit.name} Level 1`)
        .setDescription(elderSpirit.description)
        .setThumbnail("https://i.imgur.com/ojIGCpz.png")
        .addFields(
            { name: 'health', value: `${elderSpirit.health}${emojis.defensive}`, inline: true },
            { name: 'attack', value: `${elderSpirit.minAttack}-${elderSpirit.maxAttack}${emojis.offensive}`, inline: true },
            { name: 'strong against', value: `${findUnitIconsById(elderSpirit.strongAgainst)}`, inline: true },
            { name: 'weak against', value: `${findUnitIconsById(elderSpirit.weakAgainst)}`, inline: true }
        )
    embeds.push(elderSpiritEmbed);
    return embeds;
}

function findUnitIconsById(arrayOfIds) {
    const unitIcons = [];
    for (const id of arrayOfIds) {
        let unitName = "";
        if (unitData.starterUnits.find(x => x.id === id)) {
            unitName = (unitData.starterUnits.find(x => x.id === id).name);
        }
        else if (unitData.wildCreatures.find(x => x.id === id)) {
            unitName = (unitData.wildCreatures.find(x => x.id === id).name);
        }
        else {
            console.log(`no unit with id ${id} found!`);
        }
        if (unitName) {
            unitName = unitName.replace(/\s/g, "");
            unitName = "unit" + unitName;
            unitIcons.push(emojis[unitName]);
        }
    }
    if (unitIcons.length === 0) {
        unitIcons.push("-");
    }
    return unitIcons;

}
async function checkIfUserExists(userId, guildId) {
    return await User.findOne({ discord_id: userId, guild_id: guildId }).exec();
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDMPermission(false)
        .setDescription('the beginning of your journey in Expelsia'),
    async execute(interaction) {
        const embedsList = createEmbeds();
        const userExists = await checkIfUserExists(interaction.user.id, interaction.guildId);
        if (userExists) {
            await interaction.reply({
                content: `You already joined Expelsia! Try '/stats' to see your stats. If you want to start a new journey type '/new-game' (you will lose all your progress and Soulstones!)`,
                ephemeral: true
            })
        }
        else {
            await interaction.reply({
                content: `Hello <@${interaction.user.id}> \n This is the beginning of your journey in Expelsia! First, chose your origin. You can chose between four units, but chose wisely, as this can't be changed afterwards. Read the information about the units first before you chose. \n In Expelsia you have to stand up to wild creatures as well as to other players.`
            });
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('druidNaki')
                        .setLabel('Druid Naki')
                        .setEmoji(emojis["unitDruidNaki"])
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId('guardNaki')
                        .setLabel('Guard Naki')
                        .setEmoji(emojis["unitGuardNaki"])
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('forestSpirit')
                        .setLabel('Forest Spirit')
                        .setEmoji(emojis["unitForestSpirit"])
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('elderSpirit')
                        .setEmoji(emojis["unitElderSpirit"])
                        .setLabel('Elder Spirit')
                        .setStyle(ButtonStyle.Success),
                );
            await interaction.followUp({ embeds: embedsList, ephemeral: true, components: [row] });

            //collector for button interaction
            const filter = (int) => {
                const filterUnits = ["druidNaki", "guardNaki", "forestSpirit", "elderSpirit"];
                if (int.user.id === interaction.user.id) {
                    if (filterUnits.includes(int.customId)) {
                        return true;
                    }
                    else {
                        return;
                    }
                }
                return int.reply({ content: `You can't use this button!`, ephemeral: true });
            };
            const unitSelectionCollector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 120000
            });
            unitSelectionCollector.on('collect', async i => {
                const chosenUnitId = i.customId;
                let chosenUnitName = chosenUnitId.replace(/([A-Z])/g, ' $1');
                chosenUnitName = chosenUnitName.charAt(0).toUpperCase() + chosenUnitName.slice(1);
                let x = "unit" + chosenUnitId.charAt(0).toUpperCase() + chosenUnitId.slice(1);
                const chosenUnitEmoji = emojis[x];
                const validUnitIds = ["druidNaki", "guardNaki", "forestSpirit", "elderSpirit"];
                if (!validUnitIds.includes(chosenUnitId)) {
                    await i.reply({ content: `The button interaction is not valid! Try again`, ephemeral: true });
                    return;
                }
                else {
                    await i.update({ content: `<@${interaction.user.id}> chose ${chosenUnitName} ${chosenUnitEmoji}.`, embeds: [], components: [], ephemeral: false });
                    //create db entry
                    const newUser = {
                        "id": interaction.user.id,
                        "tag": interaction.user.tag,
                        "guild": interaction.guildId,
                        "unit": chosenUnitId
                    }
                    const addedNewUser = await handleNewUser(newUser);
                    if (!addedNewUser) { return console.log(`User ${newUser.id} couldn't be added!`); }
                    try {
                        //give the role Expelsia to the user
                        const expelsiaRole = interaction.guild.roles.cache.find(role => role.name === "Expelsia");
                        if (expelsiaRole) {
                            interaction.guild.members.cache.get(interaction.user.id).roles.add(expelsiaRole);
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                    unitSelectionCollector.stop();
                }
            });
        }
    },
    findUnitIconsById
};

//module.exports= findUnitIconsById;
