const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const emojis = require('./../emojis.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const itemsPerShopPage = 10; //how many items are displayed per page in shop

async function createEmbeds(start = 0) {
    // An embed message with the shop and all available items
    const embeds = [];
    var thumbnail = "";
    let availableItems = [];
    //iterate through items and add to the array
    const healItems = [];
    const collectibleItems = [];
    for await (const item of Item.find({ buyable: true })) {
        switch (item.item_type) {
            case "heal":
                healItems.push({ name: `${item.name} - ${item.cost} ${emojis.soulstone}`, value: `${item.description_short}`, cost: item.cost });
                break;
            case "revive":
                healItems.push({ name: `${item.name} - ${item.cost} ${emojis.soulstone}`, value: `${item.description_short}`, cost: item.cost });
                break;
            case "collectible":
                let rarity = "";
                if (item.effect === 1) {
                    rarity = "uncommon";
                }
                else if (item.effect === 2) {
                    rarity = "rare";
                }
                else if (item.effect === 3) {
                    rarity = "epic";
                }
                else if (item.effect === 4) {
                    rarity = "legendary";
                }
                collectibleItems.push({ name: `${item.name} - ${item.cost} ${emojis.soulstone}`, value: `Rarity: **${rarity}**\n${item.description_short}`, cost: item.cost });
                break;
        }
    }
    healItems.sort((a, b) => {
        return a.cost - b.cost;
    });
    collectibleItems.sort((a, b) => {
        return a.cost - b.cost;
    });
    availableItems.push({ name: "Healing Items", value: "*can heal or revive you*" });
    availableItems = availableItems.concat(healItems);
    if (collectibleItems.length != 0) {
        availableItems.push({ name: "collectibles", value: "*rare collectibles*" });
        availableItems = availableItems.concat(collectibleItems);
    }
    /*
    const shopPages = [];
    while (availableItems.length) {
        if (availableItems.length > itemsPerShopPage) {
            //no more than 15 items per shop page
            let i = availableItems.slice(0, itemsPerShopPage);
            shopPages.push(i);
            availableItems = availableItems.slice(itemsPerShopPage);
        }
        else {
            shopPages.push(availableItems);
            availableItems = [];
        }
    }*/

    const currentPage = availableItems.slice(start, start + itemsPerShopPage - 1);

    const shopEmbed = new MessageEmbed()
        .setTitle(`Traider Naki's Shop`)
        .setThumbnail(thumbnail)
        .setDescription(`*Spend your Soulstones on consumables and other items. \n Use '/shop [item]' to get more information and '/buy [item]' to buy an item.*`)
        .setColor("#7FFFD4")
        .addFields(currentPage);
    embeds.push(shopEmbed);
    return embeds;
}
function createItemEmbeds(item) {
    // An embed message with details of selected item
    const embeds = [];
    var itemType = item.item_type;
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
        .setDMPermission(false)
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
            //shop without specific item


            const backId = 'back'
            const forwardId = 'forward'
            const backButton = new MessageButton({
                style: 'SECONDARY',
                label: 'Back',
                emoji: '⬅️',
                customId: backId
            });
            const forwardButton = new MessageButton({
                style: 'SECONDARY',
                label: 'Forward',
                emoji: '➡️',
                customId: forwardId
            });
            lengthBuyableItems = (await Item.find({ buyable: true })).length;
            const singleShopPage = lengthBuyableItems < itemsPerShopPage;
            const embedsList = await createEmbeds();
            await interaction.reply({
                embeds: embedsList,
                components: singleShopPage
                    ? []
                    : [new MessageActionRow({ components: [forwardButton] })]
            });
            if (singleShopPage) {
                return;
            }
            //collector for button interaction
            const filter = (int) => {
                if (int.user.id === interaction.user.id) {
                    return true;
                }
                return int.reply({ content: `You can't use this button!`, ephemeral: true });
            };
            const collector = interaction.channel.createMessageComponentCollector({
                filter
            });
            let currentIndex = 0;
            collector.on('collect', async i => {
                // Increase/decrease index
                if (i.customId === backId) {
                    currentIndex -= itemsPerShopPage;
                }
                else {
                    currentIndex += itemsPerShopPage;
                }
                // Respond to interaction by updating message with new embed
                try {
                    await i.update({
                        embeds: await createEmbeds(currentIndex),
                        components: [
                            new MessageActionRow({
                                components: [
                                    // back button if it isn't the start
                                    ...(currentIndex ? [backButton] : []),
                                    // forward button if it isn't the end
                                    ...(currentIndex + itemsPerShopPage < lengthBuyableItems + 1 ? [forwardButton] : [])
                                ]
                            })
                        ]
                    });
                }
                catch {
                    collector.stop();
                }
            });
        }

    }

};