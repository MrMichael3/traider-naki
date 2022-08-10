const mongoose = require('mongoose');
const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { getUnitLevel } = require('./../controller/unitLevel.js');
const emojis = require(`./../emojis.json`);


module.exports = {
    data: new SlashCommandBuilder()
        .setName('new-game')
        .setDescription('Delete your progress and restart'),
    async execute(interaction) {
        //check if player is in Expelsia
        if (!await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId }).exec()) {
            await interaction.reply({ content: `You aren't in Expelsia. Start your journey with '/start'.` });
            return;
        }
        //delete user
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('yes')
                    .setLabel('YES')
                    .setStyle('SUCCESS'),

                new MessageButton()
                    .setCustomId('no')
                    .setLabel('NO')
                    .setStyle('DANGER')
            );
        await interaction.reply({
            content: `**Do you really want to delete your progress?**\nYour unit, inventory and soulstones will get deleted!`,
            components: [row]
        });
        //collector for button interaction
        const filter = (int) => {
            if (int.user.id === interaction.user.id) {
                return true;
            }
            return int.reply({ content: `You can't use this button!` });
        };
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 120000
        });
        collector.on('collect', async i => {
            try {
                const answer = i.customId;
                if (answer === "no") {
                    await i.reply({ content: `**User deleted!**\n\nJust kidding, you decided to stay in Expelsia and to continue your journey.` });
                    return;
                }
                else {
                    //delete db entry
                    await User.deleteOne({ discord_id: interaction.user.id, guild_id: interaction.guildId }).exec();
                    await i.reply({ content: `Your account gets **deleted**. Thanks for playing Expelsia RPG.\nIf you want to restart, **type '/start'**.` });
                }
            }
            catch {
                i.reply({ content: `Something went wrong. Try again or contact Ramsus` });
            }
            finally {
                collector.stop();
            }
        });


    }
}