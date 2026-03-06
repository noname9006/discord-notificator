/*
 * discord-notificator
 * Standalone app that sends conditional embedded messages to a Discord channel.
 *
 * Conditions:
 *  - On first run after launch: sends immediately.
 *  - On subsequent cron triggers: sends only if MIN_MESSAGES non-bot messages
 *    have been posted in the target channel since the last notification.
 *  - If not enough messages: retries after COOLDOWN_MINUTES.
 */

const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const dotenv = require('dotenv');
const { createNotificationEmbed } = require('./embed');

dotenv.config();

// -- Configuration
const DISCORD_TOKEN               = process.env.DISCORD_TOKEN;
const NOTIFICATIONS_CHANNEL       = process.env.NOTIFICATIONS_CHANNEL;
const NOTIFICATIONS_CRON_SCHEDULE = process.env.NOTIFICATIONS_CRON_SCHEDULE || '0 * * * *';
const MIN_MESSAGES                = parseInt(process.env.MIN_MESSAGES   || '10', 10);
const COOLDOWN_MINUTES            = parseInt(process.env.COOLDOWN_MINUTES || '15', 10);

// -- State
let userMessageCount      = 0;
let lastNotificationTime  = 0;
let cooldownTimeout       = null;
let firstNotificationSent = false;

// -- Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// -- Helpers
function resetCounter() {
    userMessageCount = 0;
}

async function sendNotification() {
    if (!NOTIFICATIONS_CHANNEL) {
        console.error('[NOTIFICATOR][ERROR] NOTIFICATIONS_CHANNEL is not set.');
        return;
    }

    const channel = await client.channels.fetch(NOTIFICATIONS_CHANNEL).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        console.log('[NOTIFICATOR][DEBUG] Notification NOT sent: channel not found or not text-based.');
        return;
    }

    const embed = createNotificationEmbed();

    try {
        await channel.send({ embeds: [embed] });
        console.log(`[NOTIFICATOR][DEBUG] Notification sent to channel: ${NOTIFICATIONS_CHANNEL}`);
    } catch (err) {
        console.error('[NOTIFICATOR][ERROR] Failed to send notification:', err);
        return;
    }

    lastNotificationTime = Date.now();
    resetCounter();
}

async function tryNotify() {
    if (!firstNotificationSent) {
        console.log('[NOTIFICATOR][DEBUG] First notification after launch - sending immediately.');
        await sendNotification();
        firstNotificationSent = true;
        return;
    }

    if (userMessageCount >= MIN_MESSAGES) {
        console.log(`[NOTIFICATOR][DEBUG] Enough user messages (${userMessageCount}), sending notification.`);
        await sendNotification();
    } else {
        console.log(
            `[NOTIFICATOR][DEBUG] Not enough user messages (${userMessageCount}/${MIN_MESSAGES}), ` +
            `scheduling cooldown retry in ${COOLDOWN_MINUTES} minute(s).`
        );
        if (cooldownTimeout) clearTimeout(cooldownTimeout);
        cooldownTimeout = setTimeout(() => {
            console.log('[NOTIFICATOR][DEBUG] Cooldown expired, retrying notification check.');
            tryNotify();
        }, COOLDOWN_MINUTES * 60 * 1000);
    }
}

// -- Event Handlers
client.once('ready', () => {
    console.log(`[NOTIFICATOR] Logged in as ${client.user.tag}`);
    console.log(`[NOTIFICATOR] Cron schedule: ${NOTIFICATIONS_CRON_SCHEDULE}`);
    console.log(`[NOTIFICATOR] Target channel: ${NOTIFICATIONS_CHANNEL}`);
    console.log(`[NOTIFICATOR] Min messages required: ${MIN_MESSAGES}`);
    console.log(`[NOTIFICATOR] Cooldown minutes: ${COOLDOWN_MINUTES}`);

    // Count non-bot messages in the notification channel
    client.on('messageCreate', (message) => {
        if (message.author.bot) return;
        if (message.channelId !== NOTIFICATIONS_CHANNEL) return;
        userMessageCount++;
        console.log(`[NOTIFICATOR][DEBUG] User message count: ${userMessageCount}`);
    });

    // Schedule cron job
    cron.schedule(NOTIFICATIONS_CRON_SCHEDULE, () => {
        console.log('[NOTIFICATOR][DEBUG] Cron triggered - checking if notification should be sent.');
        tryNotify();
    });
});

client.on('error', (err) => {
    console.error('[NOTIFICATOR][ERROR] Discord client error:', err);
});

// -- Boot
if (!DISCORD_TOKEN) {
    console.error('[NOTIFICATOR][FATAL] DISCORD_TOKEN is not set. Exiting.');
    process.exit(1);
}

client.login(DISCORD_TOKEN);
