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
client.login(DISCORD_TOKEN);
