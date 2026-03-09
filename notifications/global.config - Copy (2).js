const { EmbedBuilder } = require('discord.js');

module.exports = {
    channelId: process.env.GLOBAL_CHANNEL,
    intervalMinutes: parseInt(process.env.GLOBAL_INTERVAL_MINUTES || '120', 10),
    minMessages: parseInt(process.env.GLOBAL_MIN_MESSAGES || '10', 10),
    cooldownMinutes: parseInt(process.env.GLOBAL_COOLDOWN_MINUTES || '15', 10),
    notifications: [
        {
            id: 'global-notification-1',
            embed: new EmbedBuilder()
                .setTitle('Botanix community goes onchain')
        .setDescription(
            'Build your on-chain reputation. Connect wallet, mint your badge according to your ambassador level.\n\n' +
            '🔗   __**https://ambassador.botanixlabs.com/**__\n\n' +
            'Free mint • Monthly collectibles • Utility coming soon'
        )
        .setImage('https://media.discordapp.net/attachments/1430551206115282954/1480510507671748749/NFT_MAG05.png');
        },
    ],
};
