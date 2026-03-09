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
                .setColor('Gold')
                .setTitle('⛓️ Botanix community goes onchain')
                                .setDescription(
    'Build your on-chain reputation. Connect wallet, mint your asset.\n\n' +
    '🌐      __**https://ambassador.botanixlabs.com/**__\n\n' +
    'Free mint • Monthly drops • Utility soon\n\n\n' +  // triple \n
    '⚡ Need BTC on Botanix? [Quick bridge guide](https://discord.com/channels/937915188903018498/1186683012004446350/1471173793446760570)'
)
                .setImage('https://cdn.discordapp.com/attachments/1430551206115282954/1480524794129809459/NFT_MAG05_CROP.png')
        }
    ]
}