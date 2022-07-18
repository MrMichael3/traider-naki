require('dotenv').config()
const { Client, Intents } = require('discord.js');
const client = new Client(
    { intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] }
);
const mongoose = require('mongoose');
// Notify progress
client.on('ready', async () =>{
    await mongoose.connect(process.env.MONGO_URI, {
        keepAlive: true
    })
    console.log(`Logged in as ${client.user.tag}!`)
})


//Example Functionality
client.on('messageCreate',
    function(msg){
        if(msg.content === "Hallo Traidernaki"){
            msg.reply("Hello yourself!")
        }
   })

// TODO: Function to check if user exists in db and add user to db  

//TODO: create raiderNaki commands

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
	} else if (commandName === 'user') {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
	}
});


// Authenticate
client.login(process.env.DISCORD_TOKEN)