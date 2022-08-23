const mongoose = require('mongoose');
const { checkForUpdates } = require('../controller/updateController');

//connect to db
module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        mongoose.connect(process.env.MONGO_URI).then(() => {

            console.log("connected to database");
        }).catch((err) => {
            console.log(err);
        })
        console.log(`Ready! Logged in as ${client.user.tag}`);
        checkForUpdates(client);
    },
};