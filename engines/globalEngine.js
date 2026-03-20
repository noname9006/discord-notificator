const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5_000;

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
    let isSending             = false;
    let consecutiveFailures   = 0;

    function resetCounter() {
        userMessageCount = 0;
    }

    async function attemptSend(notification) {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error(`Channel ${channelId} not found or not text-based`);
        }
        await channel.send({ embeds: [notification.embed] });
    }

    async function sendCurrent() {
        if (!channelId) {
            console.error('[GLOBAL][ERROR] channelId is not set.');
            return false;
        }

        const notification = notifications[currentIndex];
        let lastErr;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await attemptSend(notification);
                console.log(`[GLOBAL][INFO] Sent "${notification.id}" (index ${currentIndex}) to channel ${channelId}.`);
                consecutiveFailures = 0;
                lastErr = undefined; // clear any stale error from a previous failed attempt
                break;
            } catch (err) {
                lastErr = err;
                const isPermanent = err.code === 50013 || err.code === 10003;
                if (isPermanent) {
                    console.error(`[GLOBAL][ERROR] Permanent error sending "${notification.id}" (code ${err.code}): ${err.message}`);
                    consecutiveFailures++;
                    return false;
                }
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    console.warn(`[GLOBAL][WARN] Send attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${delay / 1000}s. Error: ${err.message}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (lastErr) {
            consecutiveFailures++;
            if (consecutiveFailures >= 3) {
                console.error(`[GLOBAL][ERROR] ${consecutiveFailures} consecutive send failures. Last error: ${lastErr.message}`);
            }
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
        if (isSending) {
            console.log('[GLOBAL][DEBUG] Send already in progress — skipping this tick.');
            return;
        }
        isSending = true;
        try {
            if (!firstNotificationSent) {
                console.log('[GLOBAL][INFO] First notification after launch — sending immediately.');
                await sendCurrent();
                firstNotificationSent = true;
                return;
            }

            if (userMessageCount >= minMessages) {
                console.log(`[GLOBAL][INFO] Enough user messages (${userMessageCount}/${minMessages}), sending notification.`);
                await sendCurrent();
            } else {
                console.log(
                    `[GLOBAL][DEBUG] Not enough user messages (${userMessageCount}/${minMessages}), ` +
                    `scheduling cooldown retry in ${cooldownMinutes} minute(s).`
                );
                if (cooldownTimeout) clearTimeout(cooldownTimeout);
                cooldownTimeout = setTimeout(() => {
                    console.log('[GLOBAL][DEBUG] Cooldown expired, retrying notification check.');
                    tryNotify().catch(err => console.error('[GLOBAL][ERROR] tryNotify error after cooldown:', err));
                }, cooldownMinutes * 60 * 1000);
            }
        } finally {
            isSending = false;
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
            console.log('[GLOBAL][DEBUG] Interval triggered — checking if notification should be sent.');
            tryNotify().catch(err => console.error('[GLOBAL][ERROR] tryNotify error in interval:', err));
        }, intervalMinutes * 60 * 1000);
    }

    if (firstNotificationSent && state.globalState.lastSentTimestamp) {
        const elapsed   = Date.now() - new Date(state.globalState.lastSentTimestamp).getTime();
        const remaining = intervalMinutes * 60 * 1000 - elapsed;

        if (remaining > 0) {
            console.log(`[GLOBAL][INFO] Resuming after restart. Next notification in ${Math.ceil(remaining / 60000)} min.`);
            setTimeout(() => {
                tryNotify().catch(err => console.error('[GLOBAL][ERROR] tryNotify error on resume:', err));
                startScheduler();
            }, remaining);
        } else {
            tryNotify().catch(err => console.error('[GLOBAL][ERROR] tryNotify error on startup:', err));
            startScheduler();
        }
    } else {
        tryNotify().catch(err => console.error('[GLOBAL][ERROR] tryNotify error on first start:', err));
        startScheduler();
    }

    console.log(`[GLOBAL][INFO] Engine started. Channel: ${channelId}, Interval: ${intervalMinutes}min, MinMessages: ${minMessages}, Cooldown: ${cooldownMinutes}min, Notifications: ${notifications.length}`);
}

module.exports = { startGlobalEngine };
