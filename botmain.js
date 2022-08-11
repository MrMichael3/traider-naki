require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Intents } = require('discord.js');
const client = new Client(
	{ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }
);
const User = require('./User');
const Quest = require('./schemas/Quest');
const deleteUserController = require(`./controller/deleteUserController.js`);


//deleteUserController("312616992098091010", "324527754257367040"); //delete user Ramsus for test purpose


//create a .commands to store all commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
//store all commands to client.commands<
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}


//command handler: create a file for new commands and run 'deploy-commands.js' 
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	const command = client.commands.get(interaction.commandName);
	if (!command) return;
	//check if user exists already (exclude commands where no user is needed)
	const excludedCommands = ["start", "stats", "help", "shop"];
	if (!excludedCommands.includes(command.data.name) && !await User.findOne({ discord_id: interaction.user.id, guild_id: interaction.guildId }).exec()) {
		await interaction.reply({ content: "You have not selected your origin yet! Type '/start' to begin your adventure in Expelsia." });
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

//event handler
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Authenticate
client.login(process.env.DISCORD_TOKEN)