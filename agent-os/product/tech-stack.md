# Tech Stack

## Language and Runtime
- **Language:** TypeScript (strict mode, ES2022 target)
- **Runtime:** Node.js (Node16 module resolution, ESM)
- **Package Manager:** pnpm
- **TS Executor:** tsx -- runs TypeScript directly without a separate compile step

## Linting and Formatting
- **Linter/Formatter:** Biome.js -- handles both linting and formatting in a single tool

## Testing
- **Test Framework:** Vitest -- fast, TypeScript-native, and compatible with the Node.js ecosystem

## HTTP
- **HTTP Client:** Native `fetch` (Node.js 18+) for all API requests -- no external HTTP library

## APIs

### Weather
- **Provider:** Open-Meteo
- **Auth:** None required (free, no API key)
- **Rate Limits:** Free within reason
- **Usage:** Current conditions and daily forecast for a configured lat/long

### Stocks
- **Provider:** Finnhub
- **Auth:** API key via `FINNHUB_API_KEY` in `.env.development`
- **Rate Limits:** 60 requests/minute
- **Endpoints:**
  - `/quote` -- current price and daily change
  - `/stock/candle` -- 1-year historical data
- **Tracked Symbols:** TSLA, MSTR, ZIP, COIN

### Crypto
- **Provider:** CoinGecko
- **Auth:** API key via `COINGECKO_API_KEY` in `.env.development`
- **Rate Limits:** 10-30 requests/minute
- **Usage:** Current prices and daily change for BTC and ETH

### News (General)
- **Provider:** NewsAPI
- **Auth:** API key via `NEWSAPI_API_KEY` in `.env.development`
- **Rate Limits:** 100 requests/day
- **Usage:** Categorized headlines for US news, AI, business, and crypto sections

### News (Finance)
- **Provider:** Finnhub (news endpoint)
- **Auth:** Shares `FINNHUB_API_KEY`
- **Rate Limits:** Shares the 60 requests/minute Finnhub limit
- **Usage:** Market and finance news headlines

## Configuration
- **Format:** JSON config file (`config.json`) stored in the project root, holding user preferences (name, location, temperature unit, enabled modules, stock/crypto symbols)
- **Environment Variables:** API keys stored in `.env.development` (not committed), with `.env.example` as a template

## Claude Code Integration
- **Skill System:** The app is invoked via a Claude Code slash command (`/today`). The skill file lives under `.claude/commands/` and defines the command entry point. The app outputs JSON to stdout; Claude receives this JSON and formats the final Markdown digest for the user.
- **Separation of Concerns:** The app is a pure data aggregator. It makes no calls to the Claude API or `claude` CLI. All AI-driven formatting and commentary happens in the Claude Code skill layer.
