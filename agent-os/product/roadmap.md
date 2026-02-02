# Product Roadmap

## Completed

1. [x] Module runner and graceful degradation -- Core engine that loads and executes modules in order, distinguishes core vs ancillary, and logs ancillary failures without stopping the briefing. `S`
2. [x] Greeting module -- Returns a personalized greeting with the user's name and today's date/day of week. `XS`
3. [x] Weather module -- Fetches current conditions and today's high/low for a configured location using the Open-Meteo API. `S`
4. [x] User configuration -- JSON config file storing user name, location, temperature unit, enabled/ordered module list, and stock symbols with sensible defaults. `S`
5. [x] Claude Code skill integration -- Packaged as a Claude Code slash command (`/today`) with the proper skill file and entry point. `S`
6. [x] JSON-out architecture refactor -- Refactor all modules to return structured JSON instead of formatted markdown. Remove the markdown formatter. The app outputs a single combined JSON object to stdout containing all module results. `M`
7. [x] Stocks module (Finnhub) -- Replace the Alpha Vantage stocks module with Finnhub. Use `/quote` for current price and daily change, and `/stock/candle` for 1-year historical data. Track TSLA, MSTR, ZIP, COIN. `S`
8. [x] Crypto module (CoinGecko) -- New standalone module that fetches BTC and ETH prices and daily change from the CoinGecko API, replacing the Alpha Vantage crypto logic. `S`
9. [x] News module (NewsAPI) -- Replace the `claude --print` news module with direct NewsAPI calls. Fetch and categorize headlines into US news, AI, business, and crypto sections, returning structured JSON with headline, summary, and source URL. `S`
10. [x] Finance news module (Finnhub) -- Fetch market and finance news from Finnhub's news endpoint, returning structured JSON for the finance/markets news section. `S`
11. [x] Update `/today` skill for JSON formatting -- Update the Claude Code slash command skill file so Claude receives the app's JSON output and formats it into the final daily digest markdown (greeting, weather table, markets table with 1Y context, categorized news). `S`
12. [x] API key management and .env setup -- Consolidate all API keys (Finnhub, CoinGecko, NewsAPI) into `.env.development`, add `.env.example` with placeholder keys, and load via a consistent pattern across all modules. `XS`

## Future

13. [ ] Fallback API support -- Add provider-level fallback so that if a primary API (e.g., Finnhub) fails or is rate-limited, the module can retry with an alternate provider. `M`
14. [ ] Calendar integration -- New module that pulls today's calendar events and surfaces upcoming meetings or deadlines in the briefing. `M`
15. [ ] Additional news sources -- Expand news coverage with sources like Hacker News top stories, GitHub trending, or RSS feeds. `S`

> Notes
> - Items 6-12 were completed as part of the JSON-out architecture refactor spec (2026-01-31-json-out-refactor)
> - Item 6 was the foundation -- all subsequent module work (7-11) built on the JSON-out contract
> - Each item is a complete, testable feature -- the briefing is now fully functional with all six modules
