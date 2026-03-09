const cron = require('node-cron');

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5_000;

function startIndependentEngine(client, config, { stateStore, state }) {
    const { id, channelId, cronSchedule, minMessages, cooldownMinutes, embed } = config;

    const saved               = state.independentState[id] ?? {};
    let firstNotificationSent = saved.firstNotificationSent ?? false;
    let userMessageCount      = saved.userMessageCount ?? 0;
    let cooldownTimeout       = null;
    let saveMsgCountTimer     = null;
    let isSending             = false;
    let consecutiveFailures   = 0;

    function resetCounter() {
        userMessageCount = 0;
    }

    async function attemptSend() {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error(`Channel ${channelId} not found or not text-based`);
        }
        await channel.send({ embeds: [embed] });
    }

    async function sendNotification() {
        if (!channelId) {
            console.error(`[INDEPENDENT][${id}][ERROR] channelId is not set.`);
            return;
        }

        let lastErr;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await attemptSend();
                console.log(`[INDEPENDENT][${id}][INFO] Notification sent to channel ${channelId}.`);
                consecutiveFailures = 0;
                lastErr = null;
                break;
            } catch (err) {
                lastErr = err;
                const isPermanent = err.code === 50013 || err.code === 10003;
                if (isPermanent) {
                    console.error(`[INDEPENDENT][${id}][ERROR] Permanent error (code ${err.code}): ${err.message}`);
                    consecutiveFailures++;
                    return;
                }
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    console.warn(`[INDEPENDENT][${id}][WARN] Send attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${delay / 1000}s. Error: ${err.message}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (lastErr) {
            consecutiveFailures++;
            if (consecutiveFailures >= 3) {
                console.error(`[INDEPENDENT][${id}][ERROR] ${consecutiveFailures} consecutive send failures. Last error: ${lastErr.message}`);
            }
            return;
        }

        const now = new Date().toISOString();
        if (!state.independentState[id]) state.independentState[id] = {};
        state.independentState[id].firstNotificationSent = true;
        state.independentState[id].lastSentTimestamp      = now;
        state.independentState[id].userMessageCount       = 0;
        stateStore.addEntry(state, {
            type: 'independent_sent',
            notificationId: id,
            channelId,
            timestamp: now
        });
        stateStore.saveState(state);
        resetCounter();
    }

    async function tryNotify() {
        if (isSending) {
            console.log(`[INDEPENDENT][${id}][DEBUG] Send already in progress — skipping this tick.`);
            return;
        }
        isSending = true;
        try {
            if (!firstNotificationSent) {
                console.log(`[INDEPENDENT][${id}][INFO] First notification after launch — sending immediately.`);
                await sendNotification();
                firstNotificationSent = true;
                return;
            }

            if (userMessageCount >= minMessages) {
                console.log(`[INDEPENDENT][${id}][INFO] Enough user messages (${userMessageCount}/${minMessages}), sending notification.`);
                await sendNotification();
            } else {
                console.log(
                    `[INDEPENDENT][${id}][DEBUG] Not enough user messages (${userMessageCount}/${minMessages}), ` +
                    `scheduling cooldown retry in ${cooldownMinutes} minute(s).`
                );
                if (cooldownTimeout) clearTimeout(cooldownTimeout);
                cooldownTimeout = setTimeout(() => {
                    console.log(`[INDEPENDENT][${id}][DEBUG] Cooldown expired, retrying notification check.`);
                    tryNotify().catch(err => console.error(`[INDEPENDENT][${id}][ERROR] tryNotify error after cooldown:`, err));
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
        console.log(`[INDEPENDENT][${id}][DEBUG] User message count: ${userMessageCount}`);
        clearTimeout(saveMsgCountTimer);
        saveMsgCountTimer = setTimeout(() => {
            if (!state.independentState[id]) state.independentState[id] = {};
            state.independentState[id].userMessageCount = userMessageCount;
            stateStore.saveState(state);
        }, 30_000);
    });

    cron.schedule(cronSchedule, () => {
        console.log(`[INDEPENDENT][${id}][DEBUG] Cron triggered — checking if notification should be sent.`);
        tryNotify().catch(err => console.error(`[INDEPENDENT][${id}][ERROR] tryNotify error in cron:`, err));
    });

    console.log(`[INDEPENDENT][INFO] Engine started for "${id}". Channel: ${channelId}, Cron: ${cronSchedule}, MinMessages: ${minMessages}, Cooldown: ${cooldownMinutes}min`);
}

module.exports = { startIndependentEngine };
