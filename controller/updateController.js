const mongoose = require('mongoose');
const User = require('./../User.js');

const completeStatusList = ["idle", "atQuest", "endQuest", "atEvent", "atTraining", "unconscious"];
const statusWithEndTime = ["atQuest", "atEvent", "atTraining", "unconscious"];

const checkForUpdates = async ()=>{
    //get all user with the wanted status and status time ended
    const results = await User.find({status: {statusWithEndTime}, status_time: {$lte: Date.now()}});
    console.log(`filtered results: ${results}`);
    for (user in results){
        try{
            //set action based on state
            
            //change state
        }
        catch{
            //change state to idle if something goes wrong
            await user.save();
        }
    }
    setTimeout(checkForUpdates, 1000 * 10);

}

const updateHealth = (user) =>{
    console.log(`call updateHealth on user ${user.tag}`);}
    //How healing works: Heal with an item. Heal with /heal for 30%max health once a day. No healing over time. No need for this function!

module.exports={checkForUpdates};