function startGlobalEngine(client, config) {
    const { channelId, intervalMinutes, minMessages, cooldownMinutes, notifications } = config;

    if (!notifications || notifications.length === 0) {
        console.error('[GLOBAL][ERROR] No notifications defined in global config. Engine not started.');
        return;
    }

    let currentIndex         = 0;
    let userMessageCount     = 0;
    let cooldownTimeout      = null;
    let firstNotificationSent = false;

    function resetCounter() {
        userMessageCount = 0;
    }

    async function sendCurrent() {
        if (!channelId) {
            console.error('[GLOBAL][ERROR] channelId is not set.');
            return false;
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.log('[GLOBAL][DEBUG] Notification NOT sent: channel not found or not text-based.');
            return false;
        }

        const notification = notifications[currentIndex];
        try {
            await channel.send({ embeds: [notification.embed] });
            console.log(`[GLOBAL][DEBUG] Sent "${notification.id}" (index ${currentIndex}) to channel ${channelId}.`);
        } catch (err) {
            console.error('[GLOBAL][ERROR] Failed to send notification:', err);
            return false;
        }

        currentIndex = (currentIndex + 1) % notifications.length;
        resetCounter();
        return true;
    }

    async function tryNotify() {
        if (!firstNotificationSent) {
            console.log('[GLOBAL][DEBUG] First notification after launch - sending immediately.');
            await sendCurrent();
            firstNotificationSent = true;
            return;
        }

        if (userMessageCount >= minMessages) {
            console.log(`[GLOBAL][DEBUG] Enough user messages (${userMessageCount}), sending notification.`);
            await sendCurrent();
        } else {
            console.log(
                `[GLOBAL][DEBUG] Not enough user messages (${userMessageCount}/${minMessages}), ` +
                `scheduling cooldown retry in ${cooldownMinutes} minute(s).`
            );
            if (cooldownTimeout) clearTimeout(cooldownTimeout);
            cooldownTimeout = setTimeout(() => {
                console.log('[GLOBAL][DEBUG] Cooldown expired, retrying notification check.');
                tryNotify();
            }, cooldownMinutes * 60 * 1000);
        }
    }

    client.on('messageCreate', (message) => {
        if (message.author.bot) return;
        if (message.channelId !== channelId) return;
        userMessageCount++;
        console.log(`[GLOBAL][DEBUG] User message count: ${userMessageCount}`);
    });

    tryNotify();
    const intervalId = setInterval(() => {
        console.log('[GLOBAL][DEBUG] Interval triggered - checking if notification should be sent.');
        tryNotify();
    }, intervalMinutes * 60 * 1000);

    console.log(`[GLOBAL] Engine started. Channel: ${channelId}, Interval: ${intervalMinutes}min, MinMessages: ${minMessages}, Cooldown: ${cooldownMinutes}min, Notifications: ${notifications.length}`);
}

module.exports = { startGlobalEngine };
