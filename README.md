# discord-notificator

A standalone Discord bot that sends **conditional embedded messages** to a channel on a cron schedule.

---

## How It Works

| Condition | Behavior |
|-----------|----------|
| First run after launch | Sends notification **immediately** |
| Cron triggers & `userMessageCount >= MIN_MESSAGES` | Sends notification |
| Cron triggers & not enough messages | Schedules a cooldown retry in `COOLDOWN_MINUTES` |

The bot counts non-bot messages posted in the target channel. The counter resets after each successful notification.

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

### 3. Customize the embed

Edit `embed.js` to change the embedded message title, description, color, and image.

### 4. Run

```bash
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | — | Your Discord bot token |
| `NOTIFICATIONS_CHANNEL` | Yes | — | Channel ID to send notifications to |
| `NOTIFICATIONS_CRON_SCHEDULE` | No | `0 * * * *` | Cron expression for notification schedule |
| `MIN_MESSAGES` | No | `10` | Min user messages required before sending |
| `COOLDOWN_MINUTES` | No | `15` | Minutes to wait before retrying |

---

## File Structure

```
discord-notificator/
├── index.js          # Main bot logic, event handlers, cron scheduling
├── embed.js          # Embed builder — customize your message here
├── .env.example      # Example environment variables
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
