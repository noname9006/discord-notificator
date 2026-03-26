// Used for embed preview via the !!testembed command. Edit this embed to preview how it will look before adding it to global.config.js or independent.config.js.
const { EmbedBuilder } = require('discord.js');

module.exports = {
    id: 'test-notification',
    embed: new EmbedBuilder()
        .setColor('Gold')
        .setTitle('🧪 Test Embed Preview')
        .setDescription(
            'This is a **sample embed** for previewing purposes.\n\n' +
            '• Edit `notifications/test.config.js` to customise this embed\n' +
            '• Run `!!testembed` in any channel to preview it\n\n' +
            '_Only server admins can use this command._'
        )
        .setTimestamp(),
};
