const mongoose = require('mongoose');
const { checkForUpdates } = require('../controller/updateController');
const Guild = require('./../schemas/Guild.js');
//connect to db
module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        mongoose.connect(process.env.MONGO_URI).then(async () => {
            console.log("connected to database");
            console.log(`Ready! Logged in as ${client.user.tag}`);
            checkForUpdates(client);
            //create Expelsia role 
            await client.guilds.cache.forEach(async g => {
                const guild = await Guild.findOne({ id: g.id }).exec();
                if (guild && guild.allowsRoles) {
                    if (!g.roles.cache.find(role => role.name === "Expelsia")) {
                        g.roles.create({ name: 'Expelsia', color: '#43572c', mentionable: true, reason: 'members of Expelsia -Traider Naki bot' });
                    }
                }
            });
        }).catch((err) => {
            console.log(err);
        })
    },
};