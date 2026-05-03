// Used for embed preview via the !!testembed command. Edit this embed to preview how it will look before adding it to global.config.js or independent.config.js.
const { EmbedBuilder } = require('discord.js');

module.exports = {
    id: 'test-notification',
        embed: new EmbedBuilder()

        .setColor('#F7931A')

        .setTitle('MISSION TWO <a:token_btc:1438212695399858307>')

        .setDescription(
            '**The future financial system is coming.**\n' +
            '||Launch: <t:1774962000:R>||\n\n' +
            '**Botanist and Hyperion ambassadors — claim your spot first.**\n\n' +
            '**→ Open ticket:** ||<#1394601431440293918> → Mission Two||'
        )
        .setImage('https://c.tenor.com/fM676sHOU4MAAAAd/tenor.gif'),
}