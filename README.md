# claude-command-today

A TypeScript CLI that generates a personalized daily briefing by aggregating weather, stock prices, crypto prices, and news into a single JSON output. Designed to power a Claude Code `/today` slash command.

## What It Does

Runs a set of configurable modules and outputs a consolidated JSON briefing:

- **Greeting** — time-aware greeting with the current date
- **Weather** — current conditions and hourly forecast via [Open-Meteo](https://open-meteo.com/)
- **Stocks** — current quotes (Finnhub) with 14-day and 1-year historical data (Alpaca)
- **Crypto** — current prices (CoinGecko) with historical data (Alpaca)
- **News** — top headlines across US, tech, business, and crypto categories (NewsAPI)
- **Finance News** — market news from Finnhub

Modules are classified as **core** (greeting, weather) or **ancillary** (everything else). Core failures exit with an error; ancillary failures are logged and skipped gracefully.

## Setup

### Prerequisites

- Node.js
- pnpm

### Install

```bash
pnpm install
```

### Configuration

1. Copy the example files and fill in your values:

```bash
cp .env.example .env.development
cp config.example.json config.json
```

2. Add your API keys to `.env.development`:

| Variable | Source |
|---|---|
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io/) |
| `ALPACA_API_KEY` | [Alpaca](https://alpaca.markets/) |
| `ALPACA_SECRET_KEY` | [Alpaca](https://alpaca.markets/) |
| `COINGECKO_API_KEY` | [CoinGecko](https://www.coingecko.com/en/api) |
| `NEWSAPI_API_KEY` | [NewsAPI](https://newsapi.org/) |

3. Edit `config.json` to customize your briefing:

```json
{
  "name": "Your Name",
	"location": {
		"latitude": 33.97943274232051,
		"longitude": -118.46624346434118,
		"label": "Venice Beach, CA",
	},
  "temperatureUnit": "fahrenheit",
  "modules": ["greeting", "weather", "stocks", "crypto", "news", "finance-news"],
  "stocks": ["TSLA", "AAPL"],
  "crypto": [
    { "id": "bitcoin", "symbol": "BTC", "name": "Bitcoin" },
    { "id": "ethereum", "symbol": "ETH", "name": "Ethereum" }
  ]
}
```

## Usage

```bash
pnpm start
```

Output is written to stdout as JSON and saved to `artifacts/` with a timestamped filename.

## Development

```bash
pnpm run build:types   # type-check
pnpm run lint          # lint with Biome
pnpm run format        # format with Biome
pnpm test              # run tests with Vitest
```

## Project Structure

```
src/
├── modules/        # Data source modules (greeting, weather, stocks, etc.)
├── index.ts        # Entry point
├── config.ts       # Config loader with defaults
├── runner.ts       # Module orchestrator
├── types.ts        # TypeScript type definitions
├── artifact.ts     # Saves JSON output to artifacts/
└── logger.ts       # Error logging to logs/
```
