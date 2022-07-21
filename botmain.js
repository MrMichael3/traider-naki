require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, Intents } = require('discord.js');
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }
);
async function haha() {
	const haha = await User.exists({discord_id: 12323});
	if(haha){
		//console.log(`check haha: ${haha}`);
	}
	else{
		//console.log("doesnt exists!")
	}
	
}
const User = require('./User')
haha();
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
run()
async function run(){
	try{
		await User.create({ discord_id: "third_usjjer", username: "Hans", status: "idle"})
		const user = await User.findOne({discord_id: "third_user"})
		//console.log(user)

		
	}
	catch (e) {
		console.log(e.message)
	}
}
createUser("first_user", "hans")
async function createUser(d_id, name){
	//create a new user
	if (await User.exists({discord_id: d_id})){return;}
	await User.create({
		discord_id: d_id,
		username: name
	})


}
// Authenticate
client.login(process.env.DISCORD_TOKEN)