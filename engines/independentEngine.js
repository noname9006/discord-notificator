const cron = require('node-cron');

function startIndependentEngine(client, config) {
    const { id, channelId, cronSchedule, minMessages, cooldownMinutes, embed } = config;

    let userMessageCount      = 0;
    let cooldownTimeout       = null;
    let firstNotificationSent = false;

    function resetCounter() {
        userMessageCount = 0;
    }

    async function sendNotification() {
        if (!channelId) {
            console.error(`[INDEPENDENT][${id}][ERROR] channelId is not set.`);
            return;
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.log(`[INDEPENDENT][${id}][DEBUG] Notification NOT sent: channel not found or not text-based.`);
            return;
        }

        try {
            await channel.send({ embeds: [embed] });
            console.log(`[INDEPENDENT][${id}][DEBUG] Notification sent to channel ${channelId}.`);
        } catch (err) {
            console.error(`[INDEPENDENT][${id}][ERROR] Failed to send notification:`, err);
            return;
        }

        resetCounter();
    }

    async function tryNotify() {
        if (!firstNotificationSent) {
            console.log(`[INDEPENDENT][${id}][DEBUG] First notification after launch - sending immediately.`);
            await sendNotification();
            firstNotificationSent = true;
            return;
        }

        if (userMessageCount >= minMessages) {
            console.log(`[INDEPENDENT][${id}][DEBUG] Enough user messages (${userMessageCount}), sending notification.`);
            await sendNotification();
        } else {
            console.log(
                `[INDEPENDENT][${id}][DEBUG] Not enough user messages (${userMessageCount}/${minMessages}), ` +
                `scheduling cooldown retry in ${cooldownMinutes} minute(s).`
            );
            if (cooldownTimeout) clearTimeout(cooldownTimeout);
            cooldownTimeout = setTimeout(() => {
                console.log(`[INDEPENDENT][${id}][DEBUG] Cooldown expired, retrying notification check.`);
                tryNotify();
            }, cooldownMinutes * 60 * 1000);
        }
    }

    client.on('messageCreate', (message) => {
        if (message.author.bot) return;
        if (message.channelId !== channelId) return;
        userMessageCount++;
        console.log(`[INDEPENDENT][${id}][DEBUG] User message count: ${userMessageCount}`);
    });

    cron.schedule(cronSchedule, () => {
        console.log(`[INDEPENDENT][${id}][DEBUG] Cron triggered - checking if notification should be sent.`);
        tryNotify();
    });

    console.log(`[INDEPENDENT] Engine started for "${id}". Channel: ${channelId}, Cron: ${cronSchedule}, MinMessages: ${minMessages}, Cooldown: ${cooldownMinutes}min`);
}

module.exports = { startIndependentEngine };
