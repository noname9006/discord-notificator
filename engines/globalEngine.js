function startGlobalEngine(client, config, { stateStore, state }) {
    const { channelId, intervalMinutes, minMessages, cooldownMinutes, notifications } = config;

    if (!notifications || notifications.length === 0) {
        console.error('[GLOBAL][ERROR] No notifications defined in global config. Engine not started.');
        return;
    }

    let currentIndex          = (state.globalState.currentIndex ?? 0) % notifications.length;
    let firstNotificationSent = state.globalState.firstNotificationSent ?? false;
    let userMessageCount      = state.globalState.userMessageCount ?? 0;
    let cooldownTimeout       = null;
    let saveMsgCountTimer     = null;

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
        const now = new Date().toISOString();
        state.globalState.currentIndex          = currentIndex;
        state.globalState.lastSentTimestamp     = now;
        state.globalState.firstNotificationSent = true;
        state.globalState.userMessageCount      = 0;
        stateStore.addEntry(state, {
            type: 'global_sent',
            notificationId: notification.id,
            channelId,
            timestamp: now
        });
        stateStore.saveState(state);
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
        clearTimeout(saveMsgCountTimer);
        saveMsgCountTimer = setTimeout(() => {
            state.globalState.userMessageCount = userMessageCount;
            stateStore.saveState(state);
        }, 30_000);
    });

    function startScheduler() {
        setInterval(() => {
            console.log('[GLOBAL][DEBUG] Interval triggered - checking if notification should be sent.');
            tryNotify();
        }, intervalMinutes * 60 * 1000);
    }

    if (firstNotificationSent && state.globalState.lastSentTimestamp) {
        const elapsed   = Date.now() - new Date(state.globalState.lastSentTimestamp).getTime();
        const remaining = intervalMinutes * 60 * 1000 - elapsed;

        if (remaining > 0) {
            console.log(`[GLOBAL] Resuming after restart. Next notification in ${Math.ceil(remaining / 60000)} min.`);
            setTimeout(() => {
                tryNotify();
                startScheduler();
            }, remaining);
        } else {
            tryNotify();
            startScheduler();
        }
    } else {
        tryNotify();
        startScheduler();
    }

    console.log(`[GLOBAL] Engine started. Channel: ${channelId}, Interval: ${intervalMinutes}min, MinMessages: ${minMessages}, Cooldown: ${cooldownMinutes}min, Notifications: ${notifications.length}`);
}

module.exports = { startGlobalEngine };
