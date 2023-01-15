const User = require('./../schemas/User.js');
const Item = require('./../schemas/Item.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { getUnitLevel, xpOfLevel } = require('./../controller/unitLevel.js');

async function createEmbed(members, filterOption) {
    if (members.length === 0) {
        return;
    }
    const embeds = [];
    const memberFields = [];
    if (filterOption === "xp" || filterOption === "origin") {
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
            console.error(`error at leaderboard creation with xp/origin\n${err}`);
        }
    }
    else if (filterOption === "collectible") {
        try {
            for (let x = 0; x < members.length && x < 20; x++) {
                const name = members[x].username.split('#')[0];
                let collectibleText = "";
                let uncommon = 0;
                let rare = 0;
                let epic = 0;
                let legendary = 0;
                //iterate through item and count them
                for (let item of members[x].inventory) {
                    if (item.item_type === "collectible") {
                        const fullItem = await Item.findOne({ name: item.item_name });
                        switch (fullItem.effect) {
                            case 1:
                                uncommon++;
                                break;
                            case 2:
                                rare++;
                                break;
                            case 3:
                                epic++;
                                break;
                            case 4:
                                legendary++;
                                break;
                        }
                    }
                }
                if (uncommon > 0) {
                    collectibleText = `uncommon: ${uncommon}`;
                }
                if (rare > 0) {
                    collectibleText += `, rare: ${rare}`;
                }
                if (epic > 0) {
                    collectibleText += `, epic: ${epic}`;
                }
                if (legendary > 0) {
                    collectibleText += `, legendary: ${legendary}`;
                }
                if (uncommon + rare + epic + legendary > 0) {
                    memberFields.push({ name: `${name}`, value: `${collectibleText}` });
                    //collectibleText = `no collectibles found yet`;
                }
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    let title = "Leaderboard";
    if (filterOption === "origin") {
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
    else if (filterOption === "collectible") {
        title = "Leaderboard of collectibles"
    }
    const leaderboardEmbed = new EmbedBuilder()
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
            .setName('filter')
            .setDescription('filter for origin or collectibles')
            .addChoices(
                { name: 'xp', value: 'xp' },
                { name: 'Druid Naki', value: 'druidNaki' },
                { name: 'Guard Naki', value: 'guardNaki' },
                { name: 'Forest Spirit', value: 'forestSpirit' },
                { name: 'Elder Spirit', value: 'elderSpirit' },
                { name: 'Collectibles', value: 'collectible' }
            )),
    async execute(interaction) {
        const choice = interaction.options.getString('filter');
        if (!choice || choice === "xp") {
            //show leaderboard of all members based on xp
            const allMembers = await User.find({ guild_id: interaction.guildId, 'unit.xp': { $gt: 0 } });
            if (allMembers.length === 0) {
                await interaction.reply({ content: `No user found in that server!` });
                return;
            }
            //sort by xp
            allMembers.sort((a, b) => {
                return b.unit.xp - a.unit.xp;
            });
            //create embed
            const embedMessage = await createEmbed(allMembers, "xp");
            await interaction.reply({ embeds: embedMessage });
        }
        else if (choice === "collectible") {
            const collectibleMembers = await User.find({ guild_id: interaction.guildId });
            if (collectibleMembers.length === 0) {
                await interaction.reply({ content: `No user found in that server!` });
                return;
            }
            if (collectibleMembers.length > 1) {
                collectibleMembers.sort((a, b) => {
                    let aCollectibles = 0;
                    let bCollectibles = 0;
                    for (let item of a.inventory) {
                        if (item.item_type === "collectible") {
                            aCollectibles++;
                        }
                    }
                    for (let item of b.inventory) {
                        if (item.item_type === "collectible") {
                            bCollectibles++;
                        }
                    }
                    return bCollectibles - aCollectibles;
                });
            }
            //show leaderboard of all members based on amounts of collectibles
            const embedMessage = await createEmbed(collectibleMembers, "collectible");
            await interaction.reply({ embeds: embedMessage });
        }
        else {
            //show leaderboard of chosen origin based on xp
            const originMembers = await User.find({ guild_id: interaction.guildId, "unit.unit_type": choice });
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
            const embedMessage = await createEmbed(originMembers, "origin");
            await interaction.reply({ embeds: embedMessage });
        }


    }
}
