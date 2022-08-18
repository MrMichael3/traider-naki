module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in guild ${interaction.guild.id} #${interaction.channel.name} triggered an interaction.`);
	}
};