const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
const { startGlobalEngine } = require('./engines/globalEngine');
const { startIndependentEngine } = require('./engines/independentEngine');
const globalConfig = require('./notifications/global.config');
const independentConfigs = require('./notifications/independent.config');

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) { console.error('[BOT][FATAL] DISCORD_TOKEN is not set.'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    startGlobalEngine(client, globalConfig);
    for (const config of independentConfigs) startIndependentEngine(client, config);
});

client.on('error', (err) => console.error('[BOT][ERROR]', err));
client.login(DISCORD_TOKEN);
