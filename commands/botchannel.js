const { SlashCommandBuilder } = require('@discordjs/builders');
const Guild = require('./../schemas/Guild.js');
const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType } = require('discord.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('botchannel')
        .setDescription('select a channel for bot messages [admin/mod]')
        .setDefaultMemberPermissions(0)
        // .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers)
        .setDMPermission(false)
        .addChannelOption(option => option
            .setName('channel')
            .setDescription('channel name')
            .setRequired(true))
    ,
    async execute(interaction) {

        let channel = interaction.options.getChannel('channel');
        if ( channel.type != ChannelType.GuildText) {
            await interaction.reply({ content: `You can't use the channel #${channel.name}, chose a text channel instead.` });
            return;
        }
        if (!interaction.member.permissions.has([Permissions.FLAGS.MANAGE_CHANNELS])) {
            //user has not enough permissions
            await interaction.reply({ content: `You have no permission to use that command`, ephemeral: true });
            return;
        }
        try {
            //send a test message to check functionality
            await channel.send(`A test message`).then(msg => msg.delete({ timeout: "1000" }));
        }
        catch {
            await interaction.reply({ content: `❗Sending a message to channel #${channel.name} failed❗.\nMake sure the bot has permissions to interact with the channel or select another channel.` });
            return;
        }
        //store the channel in the db
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const channelId = channel.id;
        const guild = await Guild.findOne({ id: guildId }).exec();
        if (guild) {
            guild.channel = channelId;
            guild.name = guildName;
            await guild.save();
        }
        else {
            const newGuild = new Guild({
                id: guildId,
                name: guildName,
                channel: channelId
            });
            await newGuild.save();
        }
        await interaction.reply({ content: `The channel #${channel.name} was set.` });
    }
};