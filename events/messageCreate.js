module.exports = {
	name: 'messageCreate',
	execute(msg) {
		if (msg.content === "Hallo") {
			msg.reply("Hello yourself!")
		}
	},
};