const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const emojis = require('./../emojis.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');


async function createEmbeds() {
    // An embed message with the shop and all available items
    const embeds = [];
    var thumbnail = "";
    const availableItems = [];
    //iterate through items and add to the array
    for await (const item of Item.find({ buyable: true })) {
        availableItems.push({ name: `${item.name} - ${item.cost} ${emojis.soulstone}`, value: `${item.description_short}`});
    }
  
    //temporary workaround to ensure staying in the limit of fields
    if (availableItems.length > 25) {
        console.log("Too many items in shop!");
        availableItems = availableItems.slice(0, 24);
    }
    const shopEmbed = new MessageEmbed()
        .setTitle(`Traider Naki's Shop`)
        .setThumbnail(thumbnail)
        .setDescription(`*Spend your Soulstones on consumables and other items. \n Use '/shop [item]' to get more information and '/buy [item]' to buy an item.*`)
        .addFields(availableItems);
    embeds.push(shopEmbed);
    return embeds;
}
function createItemEmbeds(item) {
    // An embed message with details of selected item
    const embeds = [];
    var itemType = "Artifact";
    if (item.consumable) {
        itemType = "Consumable";
    }
    const itemEmbed = new MessageEmbed()
        .setTitle(`${item.name}`)
        .setDescription(`${item.description_long}`)
        .setThumbnail(item.image)
        .addFields(
            { name: `Price`, value: `${emojis.soulstone}${item.cost} Soulstones`, inline: true },
            { name: `Type`, value: `${itemType}`, inline: true }
        )
    embeds.push(itemEmbed);
    return embeds;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Buy items here')
        .addStringOption(option => option
            .setName('item')
            .setDescription('item name')),
    async execute(interaction) {
        //shop [item]
        if (interaction.options.getString('item')) {
            const itemName = interaction.options.getString('item');
            //check if item exists
            const item = await Item.findOne({ name: itemName }).exec();
            if (!item) {
                interaction.reply({ content: `The item ${itemName} does not exist!\nType '/shop' for a list of available items.` });
                return;
            }
            const embedsInfo = createItemEmbeds(item);
            await interaction.reply({ embeds: embedsInfo });
        }
        else {
            //shop without option
            const embedsList = await createEmbeds();
            await interaction.reply({ embeds: embedsList });
        }

    }

};