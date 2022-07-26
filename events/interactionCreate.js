const {updateStatus} = require ('./../controller/updateController.js');
const User = require('./../User.js');
const mongoose = require('mongoose');
module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
		//update status
		//update health
		userA = await User.findOne({ discord_id: interaction.user.id }).exec()
		if(await User.findOne({ discord_id: interaction.user.id }).exec()){
			updateStatus(interaction.user);
		}
		try {
			//update if someone interact with another user
			const userB = await User.findOne({ discord_id: interaction.options.get('user').user.id }).exec();;
			if(userB && userB.tag != interaction.user.tag){
				updateStatus(userB);
			}
			}
		catch {
			return;
		}
	},
};