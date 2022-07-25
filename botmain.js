require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, Intents } = require('discord.js');
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }
);
const User = require('./User')
const deleteUserController = require(`./controller/deleteUserController.js`);

deleteUserController("312616992098091010"); //delete user Ramsus for test purpose

//creat a .commands to store all commands
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

// TODO: Function to check if user exists in db and add user to db  

//command handler: create a file for new commands and run 'deploy-commands.js' 
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
	if (!command) return;
	//check if user exists already (exclude commands where no user is needed)
	console.log(`show command: ${JSON.stringify(command)}`);
	if (command.data.name != "start" && !await User.findOne({discord_id: interaction.user.id}).exec()){
		await interaction.reply({content: "You have not selected your origin yet! Type '/start' to start your adventure in Expelsia."});
		return;
	}
	try {
		await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	
	/*else if (interaction.isButton()){
		buttonIds = ["druidNaki", "guardNaki", "forestSpirit", "ElderSpirit"];
		//if (interaction.)
		console.log(`button interaction: ${interaction}`);
		interaction.reply({content: `${interaction.user.tag} clicked me`});
	}*/
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