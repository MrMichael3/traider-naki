const mongoose = require('mongoose');

//connect to db
module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
        mongoose.connect(process.env.MONGO_URI, {keepAlive: true}).then(()=>{
            console.log("connected to database");
        }).catch((err)=>{
            console.log(err);
        })
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};