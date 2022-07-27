const mongoose = require('mongoose');
const User = require('./../User.js');

//const completeStatusList = ["idle", "atQuest", "endQuest", "atEvent", "atTraining", "unconscious"];
const statusWithEndTime = ["atQuest", "atEvent", "atTraining", "unconscious"];

const checkForUpdates = async () => {
    //get all user with the wanted status and status time ended every x seconds
    const results = await User.find({ status: { $in: statusWithEndTime }, status_time: { $lte: Date.now() } });
    for (let x in results) {
        const user = results[x];
        try {
            //set action based on state
            switch (user.status) {
                case "atQuest":
                    //set status to endQuest
                    user.status = "endQuest";
                    await user.save();
                    break;

                case "atEvent":
                    //set status to idle, give event rewards
                    user.status = "idle";
                    //TODO: give event rewards
                    await user.save();
                    break;

                case "atTraining":
                    //set status to idle, give training rewards
                    user.status = "idle";
                    //TODO: give training rewards
                    await user.save();
                    break;

                case "unconscious":
                    console.log(`${user.username}, ${user.status}: unconscious`);
                    //set status to idle, change currentHealth
                    user.status = "idle";
                    user.unit.current_health = user.unit.max_health;
                    await user.save();
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
    setTimeout(checkForUpdates, 1000 * 10);

}
module.exports = { checkForUpdates };