const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { getUnitLevel } = require('./../controller/unitLevel.js');
const emojis = require(`./../emojis.json`);

function beautifyUnitName(unitType) {
    unitType = unitType.replace(/[A-Z]/g, ' $&').trim();
    unitType = unitType.charAt(0).toUpperCase() + unitType.slice(1);
    return unitType;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Show your items and soulstones'),
    async execute(interaction) {


        const user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
        const artifacts = await Item.find({ consumable: false }).exec();

        var amountOfArtifacts = 0;
        var userArtifacts = 0;
        var consumableItems = "";
        var staticItems = "";
        if (artifacts) {
            //update how many artifacts exists
            amountOfArtifacts = artifacts.length;
        }
        try {
            for (const item of user.inventory) {
                //create a string of all artifacts the user has
                if (!item.consumable) {
                    let itemString = `**${item.item_name}**\n`;
                    staticItems = staticItems + itemString;
                    userArtifacts += 1;
                }
                if (item.consumable) {
                    //create a string of all consumable items the user has
                    const itemDescription = (await Item.findOne({ name: item.item_name }).exec()).description;
                    let itemString = ``;
                    if (item.amount < 10) {
                        itemString = `0`;
                    }
                    itemString = itemString + `${item.amount}x **${item.item_name}**: ${itemDescription}\n`;
                    consumableItems = consumableItems + itemString;
                }
            }
        }
        catch {
            console.log(`Invalid items in inventory`);
            //TODO: remove invalid items and redo command
            await interaction.reply({ content: `Inventory corrupted, ask Ramsus for help!` });
            return;
        }

        if (staticItems.length === 0) {
            staticItems = "-";
        }
        if (consumableItems.length === 0) {
            consumableItems = "-";
        }
        const itemsList = [
            { name: 'Consumables', value: `${consumableItems}` },
            { name: `Artifacts ${userArtifacts}/${amountOfArtifacts}`, value: `${staticItems}` }

        ];

        //create Embed
        const inventoryEmbed = new MessageEmbed()
            .setTitle(`${user.username.slice(0, user.username.indexOf('#'))}, the ${beautifyUnitName(user.unit.unit_type)}, Level ${getUnitLevel(user.unit.xp)}`)
            .setDescription(`${emojis.soulstone}${user.soulstones} Soulstones`)
            .addFields(itemsList);
        await interaction.reply({ embeds: [inventoryEmbed] });

    }
};