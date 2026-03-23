# discord-notificator

A standalone Discord bot that sends **conditional embedded messages** to channels on cron schedules.

Supports two notification types:
- **Global queue** — notifications fire sequentially in a loop, sharing one cron schedule, `minMessages`, and `cooldownMinutes`.
- **Independent** — each notification has its own cron schedule, `minMessages`, and `cooldownMinutes`, running in complete isolation.

---

## How It Works

| Condition | Behavior |
|-----------|----------|
| First run after launch | Sends notification **immediately** (both global and each independent) |
| Cron triggers & `userMessageCount >= minMessages` | Sends notification |
| Cron triggers & not enough messages | Schedules a cooldown retry in `cooldownMinutes` |

The bot counts non-bot messages posted in the target channel. The counter resets after each successful notification.

For the **global queue**, notifications send sequentially — after the last one fires it loops back to the first. The queue pointer advances only on a successful send.

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/noname9006/discord-notificator.git
cd discord-notificator
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Customize notifications

Edit `notifications/global.config.js` to define the global queue's embed list and shared settings.

Edit `notifications/independent.config.js` to define independent notifications, each with their own embed and settings.

### 4. Run

```bash
npm start
```

---

## Environment Variables

### Global Queue

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | — | Your Discord bot token |
| `GLOBAL_CHANNEL` | Yes | — | Channel ID for global queue notifications |
| `GLOBAL_CRON_SCHEDULE` | No | `0 * * * *` | Cron expression for the global queue |
| `GLOBAL_MIN_MESSAGES` | No | `10` | Min user messages required before sending |
| `GLOBAL_COOLDOWN_MINUTES` | No | `15` | Minutes to wait before retrying |

### Independent Notification 1

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INDEPENDENT_1_CHANNEL` | Yes | — | Channel ID for independent notification 1 |
| `INDEPENDENT_1_CRON_SCHEDULE` | No | `30 * * * *` | Cron expression |
| `INDEPENDENT_1_MIN_MESSAGES` | No | `5` | Min user messages required before sending |
| `INDEPENDENT_1_COOLDOWN_MINUTES` | No | `10` | Minutes to wait before retrying |

### Notification Filters

These variables control which configured notifications are active at runtime. Both accept a comma-separated list of notification numbers (e.g. `1,2`). Leave unset or empty to enable all notifications of that type.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GLOBAL_NOTIFICATIONS` | No | _(all)_ | Restricts which global queue notifications are active. Only the listed entries will be sent; the queue cycles among them. Example: `1,2` activates global-notification-1 and global-notification-2. |
| `INDEPENDENT_NOTIFICATIONS` | No | _(all)_ | Restricts which independent notifications run. All others are disabled at startup. Example: `1` runs only independent-notification-1. |

---

## Notification Types

| Type | Cron | minMessages | Cooldown | Order |
|------|------|-------------|----------|-------|
| Global | Shared | Shared | Shared | Sequential, looping |
| Independent | Per-notification | Per-notification | Per-notification | Parallel, isolated |

---

## File Structure

```
discord-notificator/
├── index.js                        # Boot entry point
├── engines/
│   ├── globalEngine.js             # Global sequential queue engine
│   └── independentEngine.js        # Single independent notification engine
├── notifications/
│   ├── global.config.js            # Global queue config
│   └── independent.config.js       # Array of independent notification configs
├── .env.example                    # Example environment variables
├── package.json
└── README.md
```

---

## Discord Bot Permissions

Your bot needs the following:
- **Intents**: `Guilds`, `GuildMessages`, `MessageContent`
- **Permissions**: `Send Messages`, `Embed Links` in the target channel

---

## License

MIT
