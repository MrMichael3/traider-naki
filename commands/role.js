const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageActionRow, MessageButton, Permissions } = require('discord.js');
const Guild = require('./../schemas/Guild.js');



module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('enable/disable roles of this bot [admin/mod]')
        // .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.member.permissions.has([Permissions.FLAGS.MANAGE_CHANNELS])) {
            //user has not enough permissions
            await interaction.reply({ content: `You have no permission to use that command`, ephemeral: true });
            return;
        }
        //show current state
        const guild = await Guild.findOne({ id: interaction.guildId }).exec();
        let text = "";
        if (guild.allowsRoles) {
            text = `Currently, the bot will give roles to all members who start in Expelsia. Do you want to remove the **Expelsia** role?`;
        }
        else {
            text = `Currently, the bot won't give roles to the members. Do you want to enable the **Expelsia** role?`;
        }
        //reply
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('changeSetting')
                    .setLabel('YES')
                    .setStyle('PRIMARY'),

                new MessageButton()
                    .setCustomId('dontChangeSetting')
                    .setLabel('NO')
                    .setStyle('PRIMARY')
            );
        await interaction.reply({ content: text, components: [row], ephemeral: true });
        //collector for button interaction
        const filter = (int) => {
            if (int.user.id === interaction.user.id) {
                if (int.customId === "changeSetting" || int.customId === "dontChangeSetting") {
                    return true;
                }
                else{
                    return;
                }
            }
            return int.reply({ content: `You can't use this button!`, ephemeral: true });
        };
        const roleCollector = interaction.channel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 120000
        });
        roleCollector.on('collect', async i => {
            if (i.customId === "changeSetting") {
                //change state
                let t = "";
                if (guild.allowsRoles) {
                    guild.allowsRoles = false;
                    t = `The bot will no longer give users the Expelsia role.`
                    //(remove role)
                }
                else {
                    guild.allowsRoles = true;
                    //create role
                    if (!interaction.guild.roles.cache.find(role => role.name === "Expelsia")) {
                        try {
                            interaction.guild.roles.create({ name: 'Expelsia', color: '#43572c', mentionable: true, reason: 'members of Expelsia -Traider Naki bot' });
                            t = `The bot will give users who join Expelsia the Expelsia role.`

                        }
                        catch {
                            try {
                                await i.update({ content: `missing permissions to create new roles`, components: [] });
                                return;
                            }
                            catch (err) {
                                console.error(err);
                                return;
                            }
                        }
                    }
                }

                await guild.save();
                try {
                    await i.update({ content: t, components: [] });
                }
                catch {
                    console.log("interaction with command /role failed");
                    return;
                }
            }
            else {
                try {
                    await i.update({ content: "nothing changed", components: [] });
                }
                catch {
                    console.log("interaction with command /role failed");
                    return;
                }
            }
        });
    }
}