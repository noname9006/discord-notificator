const { EmbedBuilder } = require('discord.js');

module.exports = [
    {
        id: 'independent-notification-1',
        channelId: process.env.INDEPENDENT_1_CHANNEL,
        cronSchedule: process.env.INDEPENDENT_1_CRON_SCHEDULE || '30 * * * *',
        minMessages: parseInt(process.env.INDEPENDENT_1_MIN_MESSAGES || '5', 10),
        cooldownMinutes: parseInt(process.env.INDEPENDENT_1_COOLDOWN_MINUTES || '10', 10),
        embed: new EmbedBuilder()
            .setColor('Green')
            .setTitle('Independent Notification 1')
            .setDescription('This is an independent notification with its own schedule.')
            .setTimestamp(),
    },
];
