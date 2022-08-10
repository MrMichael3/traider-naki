const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { healUnit } = require('./../controller/healing.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('use an item')
        .addStringOption(option => option
            .setName('item')
            .setDescription('item name')
            .setRequired(true)),
    async execute(interaction) {
        const usedItem = await Item.findOne({ name: interaction.options.getString('item') });
        const user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
        //check if item exists and is consumable
        if (!usedItem || !usedItem.consumable) {
            await interaction.reply({ content: `This item does not exist or is not useable` });
            return;
        }
        //check if item is in inventory
        if (!user.inventory.some((n) => {
            return n.item_name === usedItem.name;
        })) {
            await interaction.reply({ content: `You don't have this item!` });
            return;
        }
        //TODO: use the item
        successfullyHealed = await healUnit(user, usedItem.effect);
        console.log(`successfullyHealed = ${successfullyHealed}`);
        if (!successfullyHealed) {
            await interaction.reply({
                content: `Could not heal. You can only heal yourself when you are idle or at training and not already have full health.`
            });
            return;
        }
        await interaction.reply({
            content: `You used the item ${usedItem.name} to heal yourself`
        });
        //get User again because healing function changed User in DB
        var changedUser = await User.findOne({ discord_id: user.discord_id, guild_id: user.guild_id });
        //reduce amount of used item in inventory and remove item from inventory if user only had one
        changedUser.inventory = changedUser.inventory.map(obj => {
            if (obj.item_name === usedItem.name) {
                let m = obj.amount;
                return { ...obj, amount: m - 1 };
            }
            return obj;
        });
        changedUser.inventory = changedUser.inventory.filter(item =>item.amount !== 0);
        await changedUser.save();
        return;
    }
};