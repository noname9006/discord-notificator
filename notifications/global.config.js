const { EmbedBuilder } = require('discord.js');

module.exports = {
    channelId: process.env.GLOBAL_CHANNEL,
    cronSchedule: process.env.GLOBAL_CRON_SCHEDULE || '0 * * * *',
    minMessages: parseInt(process.env.GLOBAL_MIN_MESSAGES || '10', 10),
    cooldownMinutes: parseInt(process.env.GLOBAL_COOLDOWN_MINUTES || '15', 10),
    notifications: [
        {
            id: 'global-notification-1',
            embed: new EmbedBuilder()
                .setColor('Gold')
                .setTitle('Global Notification 1')
                .setDescription('This is the first global notification in the queue.')
                .setTimestamp(),
        },
        {
            id: 'global-notification-2',
            embed: new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Global Notification 2')
                .setDescription('This is the second global notification in the queue.')
                .setTimestamp(),
        },
    ],
};
