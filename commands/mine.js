const mongoose = require('mongoose');
const User = require('./../User.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getUnitLevel, levelUp } = require('./../controller/unitLevel.js');
const maxStreak = 30; //days until streak bonus is at max

function calculateReward(streak) {
    //get 20-300 soulstone, 20-620 xp
    const soulstone = Math.floor(Math.random() * 101 * (Math.min(streak, maxStreak) * 0.1) + 20);
    const xp = Math.floor(Math.random() * 201 * (Math.min(streak, maxStreak) * 0.1) + 20);
    return [soulstone, xp];
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('mine soulstone daily'),
    async execute(interaction) {
        const getUser = await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId }).exec();
        if (!getUser) {
            await interaction.reply({
                content: `You aren't yet in Expelsia. Type '/start' to begin your journey!`
            });
            return;
        }
        const lastMining = getUser.mining.last_mining;
        const xpBeforeReward = getUser.unit.xp;
        //check if user can mine
        if (new Date(lastMining.toDateString()) < new Date(new Date().toDateString())) {
            //set new Date
            getUser.mining.last_mining = Date.now();
            await getUser.save();
            var mine_streak = getUser.mining.streak;
            mine_streak = mine_streak + 1;
            const reward = calculateReward(mine_streak);
            if (mine_streak === 1) {
                await interaction.reply({ content: `you mined ${reward[0]} soulstone and got ${reward[1]} XP!` });
            }
            else {
                await interaction.reply({ content: `you mined ${reward[0]} soulstone and got ${reward[1]} XP!\n You are on a ${mine_streak} days streak.` });
            }
            //save changes to DB
            getUser.soulstones = getUser.soulstones + reward[0];
            getUser.unit.xp = xpBeforeReward + reward[1];
            getUser.mining.streak = mine_streak;
            await getUser.save();
            if (getUnitLevel(xpBeforeReward) != getUnitLevel(getUser.unit.xp)) {
                //user got a level up
                levelUp(getUser, xpBeforeReward, interaction.channel);
            }
        }
        else {
            await interaction.reply({ content: "You have mined already today. Come back tomorrow." });
            return;
        }
    }


}