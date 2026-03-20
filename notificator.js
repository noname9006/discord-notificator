const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();
const { startGlobalEngine } = require('./engines/globalEngine');
const { startIndependentEngine } = require('./engines/independentEngine');
const globalConfig = require('./notifications/global.config');
const independentConfigs = require('./notifications/independent.config');
const stateStore = require('./store/stateStore');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) { console.error('[BOT][FATAL] DISCORD_TOKEN is not set.'); process.exit(1); }

process.on('unhandledRejection', (reason) => {
    console.error('[BOT][ERROR] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[BOT][FATAL] Uncaught exception:', err);
    process.exit(1);
});

function parseFilter(envValue) {
    if (!envValue || !envValue.trim()) return null;
    return new Set(
        envValue.split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0)
    );
}

const globalFilter      = parseFilter(process.env.GLOBAL_NOTIFICATIONS);
const independentFilter = parseFilter(process.env.INDEPENDENT_NOTIFICATIONS);

// GLOBAL_NOTIFICATIONS (comma-separated numbers, e.g. "1,2") restricts which
// global notifications are active. If set to a single value such as "1", only
// that notification will ever be sent and the engine will never advance to the
// others. Leave this env var unset (or empty) to enable all notifications.
const activeGlobalConfig = {
    ...globalConfig,
    notifications: globalFilter
        ? globalConfig.notifications.filter(n => {
            const num = parseInt(n.id.match(/(\d+)$/)?.[1], 10);
            return globalFilter.has(num);
          })
        : globalConfig.notifications
};

const activeIndependentConfigs = independentFilter
    ? independentConfigs.filter(cfg => {
        const n = parseInt(cfg.id.match(/(\d+)$/)?.[1], 10);
        return independentFilter.has(n);
      })
    : independentConfigs;

const state = stateStore.loadState();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    startGlobalEngine(client, activeGlobalConfig, { stateStore, state });
    for (const cfg of activeIndependentConfigs) startIndependentEngine(client, cfg, { stateStore, state });
});

client.on('error', (err) => console.error('[BOT][ERROR]', err));

function shutdown(signal) {
    console.log(`[BOT] Received ${signal} — flushing state and exiting.`);
    stateStore.saveState(state);
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

client.login(DISCORD_TOKEN).catch((err) => {
    console.error('[BOT][FATAL] Failed to log in to Discord:', err.message);
    process.exit(1);
});
