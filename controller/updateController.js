const User = require('./../User.js');
const Guild = require('./../schemas/Guild.js');
const Item = require('./../schemas/Item.js');
const { trainingReward } = require('./../commands/training.js');
const { levelUp } = require('./unitLevel.js');

const healPercentage = 0.1 //percentage of maxHealth healed

//const completeStatusList = ["idle", "atQuest", "endQuest", "atEvent", "atTraining", "unconscious"];
const healableStatus = ["idle", "atTraining"];
const statusWithEndTime = ["atQuest", "atEvent", "atTraining", "unconscious"];
let lastHour = new Date().getHours();
/*
let lastShopRotation = new Date;
lastShopRotation.setDate(lastShopRotation.getDate() - (lastShopRotation.getDay() - 1));
lastShopRotation.setHours(0, 0, 0, 0);
*/

async function healUser() {
    let newHour = new Date().getHours();
    if (newHour != lastHour) {
        //heal users every hour
        const healableUsers = await User.find({ status: { $in: healableStatus } });
        for (let user of healableUsers) {
            try {
                //heal the user
                user.unit.current_health = Math.min(user.unit.max_health, Math.round(user.unit.current_health + user.unit.max_health * healPercentage));
                await user.save();
            }
            catch {
                console.log(`Autoheal: Can't heal user!`);
            }
        }
        lastHour = newHour;
    }
}
async function statusTime(client) {
    //get all user with the wanted status and status time ended every x seconds
    const results = await User.find({ status: { $in: statusWithEndTime }, status_time: { $lte: Date.now() } });
    for (let x in results) {
        const user = results[x];
        const guild = await Guild.findOne({ id: user.guild_id }).exec();
        let targetChannel;
        if (guild && guild.channel) {
            try {
                targetChannel = client.channels.cache.get(guild.channel);
            }
            catch {
                targetChannel = false;
            }
        }
        try {
            //set action based on state
            switch (user.status) {
                case "atQuest":
                    //set status to endQuest
                    user.status = "endQuest";
                    await user.save();
                    if (targetChannel) {
                        try {
                            await targetChannel.send(`<@${user.discord_id}> returned from his quest journey. Type */quest* to see if you were successful.`);
                        }
                        catch {
                            console.log(`targetChannel of guild ${client.guild} not reachable`);
                        }
                    }
                    break;
                case "atEvent":
                    //set status to idle, give event rewards
                    user.status = "idle";
                    //TODO: give event rewards
                    await user.save();
                    break;
                case "atTraining":
                    const xpBefore = user.unit.xp;
                    const xpReward = await trainingReward(user);
                    const userAfterReward = await User.findOne({ discord_id: user.discord_id, guild_id: user.guild_id }).exec();

                    if (targetChannel) {
                        try {
                            await targetChannel.send(`<@${user.discord_id}> has finished his training and received ${xpReward}XP!`);
                            await levelUp(userAfterReward, xpBefore, targetChannel);
                        }
                        catch {
                            await levelUp(userAfterReward, xpBefore);
                            console.log(`targetChannel of guild ${client.guild} not reachable`);
                        }
                    }
                    else {
                        await levelUp(userAfterReward, xpBefore);
                    }
                    break;
                case "unconscious":
                    //set status to idle, change currentHealth
                    user.status = "idle";
                    user.unit.current_health = user.unit.max_health;
                    await user.save();
                    if (targetChannel) {
                        try {
                            await targetChannel.send(`<@${user.discord_id}> has fully recovered and is ready for new adventures.`);
                        }
                        catch {
                            console.log(`targetChannel of guild ${client.guild} not reachable`);
                        }
                    }
                    break;
            }
        }
        catch {
            //change state to idle if something goes wrong
            console.log(`error in updateController!!`);
            user.status = "idle";
            await user.save();
        }
    }
}
async function collectibleShopRotation() {
    let currentDate = new Date();
    const oneWeekInMs = 604800000;
    const riseInTimeGuild = await Guild.findOne({ id: "324527754257367040" }).exec();
    if (!riseInTimeGuild) {
        console.log(`guild does not exist`)
        return;
    }
    try {
        var lastShopRotation = new Date(riseInTimeGuild.shopRotation);
    }
    catch (err) {
        console.error(err);
        return;
    }
    if (!lastShopRotation) {
        try {
            console.log(`last shop rotation not defined in ${riseInTimeGuild.name}`);
            return;
        }
        catch (err) {
            console.error(err);
            return;
        }
    }
    if (lastShopRotation.getTime() + oneWeekInMs > currentDate.getTime()) {
        return;
    }
    console.log(`change shop rotation`)
    //change shop rotation
    lastShopRotation = currentDate;
    //add a new collectible to shop
    const newBuyableCollectables = await Item.find({ buyable: false, item_type: "collectible", effect: { $lte: 2 } })
    if (newBuyableCollectables.length === 0) {
        console.log(`no collectibles found for shop rotation!`);
        return;
    }
    const randomSelector = Math.floor(Math.random() * (newBuyableCollectables.length));
    console.log(`selector: ${randomSelector} of ${newBuyableCollectables.length}`);
    console.log(`item: ${newBuyableCollectables[randomSelector].name}`)
    newBuyableCollectables[randomSelector].buyable = true;
    //delete previous collectibles from shop
    const prevBuyableCollectables = await Item.find({ item_type: "collectible", buyable: true });
    if (prevBuyableCollectables.length > 0) {
        for (let item of prevBuyableCollectables) {
            item.buyable = false;
            await item.save();
        }
    }
    await newBuyableCollectables[randomSelector].save();
    riseInTimeGuild.shopRotation = lastShopRotation;
    await riseInTimeGuild.save();
    return;
}




const checkForUpdates = async (client) => {
    await healUser();
    await statusTime(client);
    await collectibleShopRotation();
    setTimeout(() => checkForUpdates(client), 1000);
}
module.exports = { checkForUpdates };
