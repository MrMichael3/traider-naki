const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy certain item from the shop')
        .addStringOption(option => option
            .setName('item')
            .setDescription('item name')
            .setRequired(true)),
    async execute(interaction) {
        const item = await Item.findOne({ name: interaction.options.getString('item') }).exec();
        //check if item exist
        if (Object.keys(item).length === 0) {
            interaction.reply({ content: `The item ${item} does not exist in the shop!` });
            return;
        }
        //check if user can buy the item
        try {
            const user = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId });
            if (user.soulstones < item['cost']) {
                interaction.reply({ content: `You don't have enough Soulstones to buy this item!` });
                return;
            }
            const itemInInventory = user.inventory.find(x => x.item_name === item.name);
            if (itemInInventory && itemInInventory.amount >= item.quantity) {
                interaction.reply({ content: `You already have the maximum amount of this item!` });
                return;
            }
            //add item to inventory, remove soulstones
            user.soulstones = user.soulstones - item.cost
            if (itemInInventory) {
                user.inventory.find(x => x.item_name === item.name)["amount"] = itemInInventory.amount + 1;
            }
            else {
                const newItemInInventory = {
                    item_name: item.name,
                    item_id: item.item_id,
                    amount: 1,
                    consumable: item.consumable
                }
                user.inventory.push(newItemInInventory);
            }
            await user.save();
            interaction.reply({ content: `Successfully bought ${item.name}` });
        }
        catch {
            interaction.reply({ content: "Something went wrong!" });
        }
    }
};
