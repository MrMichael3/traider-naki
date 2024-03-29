const mongoose = require('mongoose');
const User = require('./../schemas/User.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const unitStats = require('./../unitStats.json');
const { EmbedBuilder } = require('discord.js');
const emojis = require('./../emojis.json');
const { getUnitLevel, xpOfLevel } = require('./../controller/unitLevel.js');
const { findUnitIconsById } = require('./start.js');
const progressbar = require('string-progressbar');
const { readableTime } = require('./quest.js');

function createEmbeds(user) {
	const embeds = [];
	const userName = user.username.slice(0, user.username.indexOf('#'));
	var thumbnail = "";
	var strongAgainst = [];
	var weakAgainst = [];
	var unitId;
	var unitName = user.unit.unit_type.replace(/([A-Z])/g, ' $1');
	unitName = unitName.charAt(0).toUpperCase() + unitName.slice(1);
	const unitLevel = getUnitLevel(user.unit.xp);
	const maxXp = xpOfLevel(unitLevel + 1);
	const prevMaxXp = xpOfLevel(Math.max(unitLevel, 1));
	switch (user.unit.unit_type) {
		case "druidNaki":
			unitId = 1;
			thumbnail = "https://i.imgur.com/ZYOXfAK.png";
			break;
		case "guardNaki":
			unitId = 2;
			thumbnail = "https://i.imgur.com/M6lHdxY.png";
			break;
		case "forestSpirit":
			unitId = 3;
			thumbnail = "https://i.imgur.com/vVTBl2m.png";
			break;
		case "elderSpirit":
			unitId = 4;
			thumbnail = "https://i.imgur.com/ojIGCpz.png";
			break;
		default:
			console.log("invalid unit type!");
			return [];
	}
	strongAgainst = unitStats.starterUnits.find(x => x.id === unitId).strongAgainst;
	weakAgainst = unitStats.starterUnits.find(x => x.id === unitId).weakAgainst;
	let statusWithTime = user.status;
	const l = ["atTraining", "atQuest", "unconscious"];
	if (l.includes(user.status)) {
		statusWithTime += ` (${readableTime(user.status_time - Date.now())})`;
	}
	const unitStatsEmbed = new EmbedBuilder()
		.setTitle(`${userName}, ${unitName} Level ${unitLevel}`)
		.setThumbnail(thumbnail)
		.setDescription(`*${unitStats.starterUnits.find(x => x.id === unitId).description}* \n ${progressbar.filledBar(maxXp - prevMaxXp, user.unit.xp - prevMaxXp)[0]} \n XP: ${user.unit.xp - prevMaxXp}/${maxXp - prevMaxXp}`)
		.addFields(
			{ name: 'Health', value: `${user.unit.current_health}/${user.unit.max_health}${emojis.defensive}`, inline: true },
			{ name: 'Attack', value: `${user.unit.min_attack}-${user.unit.max_attack}${emojis.offensive}`, inline: true },
			{ name: 'Status', value: `${statusWithTime}`, inline: true },
			{ name: 'Strong against', value: `${findUnitIconsById(strongAgainst)}`, inline: true },
			{ name: 'Weak against', value: `${findUnitIconsById(weakAgainst)}`, inline: true }
		)
	embeds.push(unitStatsEmbed);
	return embeds;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDMPermission(false)
		.setDescription('get stats of yourself or another user')
		.addUserOption((option) => option.setName('user').setDescription('user')),
	async execute(interaction) {
		//store user, author as default user
		var discordUser;
		if (interaction.options.get('user')) {
			discordUser = interaction.options.get('user').user;
		}
		else {
			discordUser = interaction.user;
		}
		try {
			const user = await User.findOne({ discord_id: discordUser.id, guild_id: interaction.guildId }).exec();
			//show stats
			const embedsList = createEmbeds(user);
			await interaction.reply({ embeds: embedsList });
		}
		catch {
			interaction.reply({ content: `This user isn't yet in Expelsia! \n Type '/start' to start your journey.` });
			return;
		}
	},
};