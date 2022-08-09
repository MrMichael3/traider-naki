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

        try {
            const user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
            const artifacts = await Item.find({ consumable: false }).exec();
            var amountOfArtifacts = 0;
            if (artifacts) {
                amountOfArtifacts = artifacts.length;
            }
            const userArtifacts = 0;
            var consumableItems = "";
            var staticItems = "";
            for (const item of user.inventory) {
                if (!item.consumable) {
                    let itemString = `**${item.item_name}**\n`;
                    staticItems = staticItems + itemString;
                    userArtifacts += 1;
                }
            }
            for (const item of user.inventory) {
                if (item.consumable) {
                    const itemDescription = (await Item.findOne({ name: item.item_name }).exec()).description;
                    let itemString = ``;
                    if (item.amount < 10) {
                        itemString = `0`;
                    }
                    itemString = itemString + `${item.amount}x **${item.item_name}**: ${itemDescription}\n`;
                    consumableItems = consumableItems + itemString;
                }
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
        catch {
            await interaction.reply({ content: `inventory command failed!` });
        }
    }
};