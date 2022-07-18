const mongoose = require('mongoose');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
        mongoose.connect(process.env.MONGO_URI, {keepAlive: true})
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};