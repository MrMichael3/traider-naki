const { SlashCommandBuilder } = require('@discordjs/builders');
const User = require('./User');
const {MessageEmbed } = require('discord.js');
const unitData = require('./../unitStats.json');
const emojis = require('./../emojis.json');
const druidNaki = unitData.starterUnits.find(x => x.id === 1);
const guardNaki = unitData.starterUnits.find(x => x.id === 2);
const forestSpirit = unitData.starterUnits.find(x => x.id === 3);
const elderSpirit = unitData.starterUnits.find(x => x.id === 4);

//create embed unit descriptions
function createEmbeds(interaction){
    // TODO: Create forward/back buttons instead of 4 embeds
    const embeds = [];
    //druid Naki
    const druidNakiEmbed = new MessageEmbed()
    //.setColor()
    .setTitle(`${druidNaki.name} Level 1`)
    .setDescription(druidNaki.description)
    .setThumbnail("https://i.imgur.com/ZYOXfAK.png")
    .addFields(
        { name: 'health', value: `${druidNaki.health}${emojis.defensive}`, inline: true},
        { name: 'attack', value: `${druidNaki.minAttack}-${druidNaki.maxAttack}${emojis.offensive}`,  inline: true},
        { name: 'strong against', value: `${findUnitIconsById(druidNaki.strongAgainst)}`, inline: true},
        { name: 'weak against', value: `${findUnitIconsById(druidNaki.weakAgainst)}`, inline: true}
    )
    embeds.push(druidNakiEmbed);
    
    //Guard Naki
    const guardNakiEmbed = new MessageEmbed()
    //.setColor()
    .setTitle(`${guardNaki.name} Level 1`)
    .setDescription(guardNaki.description)
    .setThumbnail("https://i.imgur.com/M6lHdxY.png")
    .addFields(
        { name: 'health', value: `${guardNaki.health}${emojis.defensive}`, inline: true},
        { name: 'attack', value: `${guardNaki.minAttack}-${guardNaki.maxAttack}${emojis.offensive}`,  inline: true},
        { name: 'strong against', value: `${findUnitIconsById(guardNaki.strongAgainst)}`, inline: true},
        { name: 'weak against', value: `${findUnitIconsById(guardNaki.weakAgainst)}`, inline: true}
    )
    embeds.push(guardNakiEmbed);

    //Forest Spirit
    const forestSpiritEmbed = new MessageEmbed()
    //.setColor()
    .setTitle(`${forestSpirit.name} Level 1`)
    .setDescription(forestSpirit.description)
    .setThumbnail("https://i.imgur.com/vVTBl2m.png")
    .addFields(
        { name: 'health', value: `${forestSpirit.health}${emojis.defensive}`, inline: true},
        { name: 'attack', value: `${forestSpirit.minAttack}-${forestSpirit.maxAttack}${emojis.offensive}`,  inline: true},
        { name: 'strong against', value: `${findUnitIconsById(forestSpirit.strongAgainst)}`, inline: true},
        { name: 'weak against', value: `${findUnitIconsById(forestSpirit.weakAgainst)}`, inline: true}
    )
    embeds.push(forestSpiritEmbed);

    //Elder Spirit
    const elderSpiritEmbed = new MessageEmbed()
    //.setColor()
    .setTitle(`${elderSpirit.name} Level 1`)
    .setDescription(elderSpirit.description)
    .setThumbnail("https://i.imgur.com/ojIGCpz.png")
    .addFields(
        { name: 'health', value: `${elderSpirit.health}${emojis.defensive}`, inline: true},
        { name: 'attack', value: `${elderSpirit.minAttack}-${elderSpirit.maxAttack}${emojis.offensive}`,  inline: true},
        { name: 'strong against', value: `${findUnitIconsById(elderSpirit.strongAgainst)}`, inline: true},
        { name: 'weak against', value: `${findUnitIconsById(elderSpirit.weakAgainst)}`, inline: true}
    )
    embeds.push(elderSpiritEmbed);
    return embeds;
}

    function findUnitIconsById(arrayOfIds){
    const unitIcons = [];
    for (const id of arrayOfIds) {
        let unitName = "";
        if (unitData.starterUnits.find(x => x.id === id)) {
            unitName = (unitData.starterUnits.find(x => x.id === id).name);
        }
        else if (unitData.wildCreatures.find(x => x.id === id)) {
            unitName = (unitData.wildCreatures.find(x => x.id === id).name);
        }
        else{
            console.log(`no unit with id ${id} found!`);
        }
        if (unitName){
            unitName = unitName.replace(/\s/g, "");
            unitName = "unit" + unitName;
            unitIcons.push(emojis[unitName]);
        }
    }
    if(unitIcons.length === 0){
        unitIcons.push("-");
    }
    return unitIcons;

}
async function checkIfUserExists(id){
    return //await User.exists({discord_id: id});
}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('the beginning of your journey in Expelsia'),
        async execute(interaction) {
            const embedsList = createEmbeds(interaction);
            //const emojiList = await interaction.guild.emojis.cache.map(emoji => emoji.toString()).join(" ");
            const haha = await checkIfUserExists(interaction.user.id);
            if (haha){
            await interaction.reply({
                content:`You already joined Expelsia! Try '/stats' to see your stats. If you want to start a new journey type '/new-game' (you will lose all your progress and Soulstones!)`,
                ephemeral: true})
            }
            else{
		        await interaction.reply({
                    content: `Hello ${interaction.user.tag}\n This is the beginning of your journey in Expelsia! First, chose your origin. You can chose between four units, but chose wisely, as this can't be changed afterwards. Read the information about the units first before you chose. \n In Expelsia you have to stand up to wild creatures as well as to other players.`,
                    ephemeral: true});
                await interaction.followUp({embeds: embedsList, ephemeral: true})
            }},
};


