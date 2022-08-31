const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { healUnit } = require('./../controller/healing.js');
const emojis = require('./../emojis.json');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDMPermission(false)
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
        switch (usedItem.item_type) {

            case "revive":
                //reviving item
                const newHealth = user.unit.max_health * usedItem.effect;
                if (newHealth <= user.unit.current_health) {
                    await interaction.reply({ content: `You can't use ${usedItem.name} because your health isn't under ${usedItem.effect * 100}% hp.` });
                    return;
                }
                user.unit.current_health = newHealth;
                if (user.status === "unconscious") {
                    user.status = "idle";
                    await user.save();
                    var changedUser = await User.findOne({ discord_id: user.discord_id, guild_id: user.guild_id });
                    interaction.reply({ content: `You used the item ${usedItem.name} to wake up and restore your health to ${usedItem.effect * 100}%.` });
                }
                else {
                    await user.save();
                    var changedUser = await User.findOne({ discord_id: user.discord_id, guild_id: user.guild_id });
                    interaction.reply({ content: `You used the item ${usedItem.name} to restore your health to ${usedItem.effect * 100}%.` });
                }
                break;

            case "heal":
                //healing item
                if (user.status === "unconscious") {
                    await interaction.reply({ content: `You can't heal yourself while you are unconscious!` });
                    return;
                }
                const successfullyHealed = await healUnit(user, usedItem.effect);
                if (!successfullyHealed) {
                    await interaction.reply({
                        content: `Could not heal. You can't heal yourself when unconscious or at full health.`
                    });
                    return;
                }
                var changedUser = await User.findOne({ discord_id: user.discord_id, guild_id: user.guild_id });
                await interaction.reply({
                    content: `You used the item ${usedItem.name} to heal yourself.\nYour health: ${changedUser.unit.current_health}/${changedUser.unit.max_health}${emojis.defensive}`
                });
                break;
            default:
                await interaction.reply({ content: `item ${usedItem.name} has an unknown item type: ${usedItem.type}` });
                return;
        }
        try {
            //reduce amount of used item in inventory and remove item from inventory if user only had one
            changedUser.inventory = changedUser.inventory.map(obj => {
                if (obj.item_name === usedItem.name) {
                    let m = obj.amount;
                    return { ...obj, amount: m - 1 };
                }
                return obj;
            });
            changedUser.inventory = changedUser.inventory.filter(item => item.amount !== 0);
            await changedUser.save();
            return;
        }
        catch {
            return;
        }
    }
};