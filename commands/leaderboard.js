const User = require('./../User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { getUnitLevel, xpOfLevel } = require('./../controller/unitLevel.js');

function createEmbed(members, filterOption) {
    if (members.length === 0) {
        return;
    }
    const embeds = [];
    const memberFields = [];
    if (filterOption === "xp" || filterOption === "origin") {
        console.log("hi")
        let rank = 1;
        let prevRank = 1;
        try {
            for (let x = 0; x < members.length && x < 20; x++) {
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
            memberFields.push({ name: `_____________`, value: ` users: ${members.length} ` })
        }
        catch (err) {
            console.error(err);
        }
    }
    let title = "Leaderboard";
    if (filterOption === "origin") {
        console.log("filter origin")
        switch (members[0].unit.unit_type) {
            case "druidNaki":
                title += ` Druid Nakis`;
                break;
            case "guardNaki":
                title += ` Guard Nakis`;
                break;
            case "forestSpirit":
                title += ` Forest Spirits`;
                break;
            case "elderSpirit":
                title += ` Elder Spirits`;
                break;
        }
    }
    const leaderboardEmbed = new MessageEmbed()
        .setTitle(title)
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
                { name: 'Druid Naki', value: 'druidNaki' },
                { name: 'Guard Naki', value: 'guardNaki' },
                { name: 'Forest Spirit', value: 'forestSpirit' },
                { name: 'Elder Spirit', value: 'elderSpirit' },

                { name: 'collectible', value: 'collectible' }
            )),
    async execute(interaction) {
        const choice = interaction.options.getString('sort');
        if (!choice || choice === "xp") {
            //show leaderboard of all members based on xp
            const allMembers = await User.find({ guild_id: interaction.guildId });
            if (allMembers.length === 0) {
                await interaction.reply({ content: `No user found in that server!` });
                return;
            }
            //sort by xp
            allMembers.sort((a, b) => {
                return b.unit.xp - a.unit.xp;
            });
            //Create embed
            const embedMessage = createEmbed(allMembers, "xp");
            await interaction.reply({ embeds: embedMessage });
        }
        else if (choice === "collectible") {
            //show leaderboard of all members based on amounts of collectibles
        }
        else {
            //show leaderboard of chosen origin based on xp
            const originMembers = await User.find({ guild_id: interaction.guildId, "unit.unit_type": choice });
            console.log(`choice: ${choice}`)
            if (originMembers.length === 0) {
                await interaction.reply({ content: `No ${choice}s found!` });
                return;
            }
            //sort by xp
            if (originMembers.length > 1) {
                originMembers.sort((a, b) => {
                    return b.unit.xp - a.unit.xp;
                });
            }
            //Create embed
            const embedMessage = createEmbed(originMembers, "origin");
            await interaction.reply({ embeds: embedMessage });
        }


    }
}
