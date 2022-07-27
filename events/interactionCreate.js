const { updateStatus } = require('./../controller/updateController.js');
const User = require('./../User.js');
const mongoose = require('mongoose');
module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
	}
};