const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { getUnitLevel, xpOfLevel } = require('./../controller/unitLevel.js');

function createEmbed(members, filterOption) {
    const embeds = [];
    const memberFields = [];
    if (filterOption === "xp") {
        let rank = 1;
        let prevRank = 1;
        try {
            for (let x = 0; x < members.length; x++) {
                //store relevant information of the sorted members
                const lv = getUnitLevel(members[x].unit.xp);
                const levelXp = members[x].unit.xp - xpOfLevel(lv);
                const maxXp = xpOfLevel(lv + 1) - xpOfLevel(lv);
                const name = members[x].username.split('#')[0];
                if (x > 0 && members[x].unit.xp === members[x - 1].unit.xp) {
                    //same rank if members have same amount of xp
                    memberFields.push({ name: `#${prevRank} ${name} `, value: `Level **${lv}** *(${levelXp}/${maxXp})*` });
                }
                else {
                    prevRank = rank;
                    memberFields.push({ name: `#${rank} ${name}`, value: `Level **${lv}** *(${levelXp}/${maxXp})*` });
                }
                rank++;
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    const leaderboardEmbed = new MessageEmbed()
        .setTitle(`Leaderboard`)
        .addFields(memberFields);
    embeds.push(leaderboardEmbed);
    return embeds;
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDMPermission(false)
        .setDescription('Show all members of Expelsia')
        .addStringOption(option => option
            .setName('sort')
            .setDescription('filter')
            .addChoices(
                { name: 'xp', value: 'xp' },
                { name: 'origin', value: 'origin' },
                { name: 'collectible', value: 'collectible' }
            )),
    async execute(interaction) {
        const choice = interaction.options.getString('sort');
        if (!choice || choice === "xp") {
            //show leaderboard of all members based on xp
            const allMembers = await User.find({ guild_id: interaction.guildId });
            //sort by xp
            allMembers.sort((a, b) => {
                return b.unit.xp - a.unit.xp;
            });
            //Create embed
            embedMessage = createEmbed(allMembers, "xp");
            await interaction.reply({ embeds: embedMessage });
        }
        else if (choice === "origin") {
            //show leaderboard of chosen origin based on xp
        }
        else if (choice === "soulstone") {
            //show leaderboard of all members based on soulstone
        }

    }
}
