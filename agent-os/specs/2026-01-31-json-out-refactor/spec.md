# Specification: JSON-Out Architecture Refactor

## Goal

Refactor all modules to return structured JSON instead of formatted markdown, replace Alpha Vantage stocks and `claude --print` news with dedicated API providers (Finnhub, CoinGecko, NewsAPI), and update the `/today` skill so Claude formats the final digest from the app's JSON output.

## User Stories

- As a developer who starts the day in the terminal, I want a single `/today` command that delivers a clean daily briefing (weather, markets, news) so I can get oriented without leaving Claude Code.
- As the maintainer of this tool, I want each module to return raw JSON so I can add, swap, or extend data sources without touching presentation logic.

## Specific Requirements

**JSON-out module contract**
- Every module function returns `Promise<ModuleResult>` where `data` is a typed JSON-serializable object (not a formatted string)
- Remove `src/formatter.ts` and all references to it; the app no longer does any markdown formatting
- The `main()` function in `src/index.ts` collects all `ModuleResult[]` from `runModules`, assembles them into a single top-level JSON object keyed by module id (e.g. `{ greeting: {...}, weather: {...}, stocks: {...}, ... }`), and writes it to stdout via `JSON.stringify`
- Failed ancillary modules are omitted from the JSON output (errors still logged to `logs/errors.log` via existing `logError`)
- Failed core modules cause the process to exit with a non-zero code and an error JSON object on stdout
- The `saveArtifact` function in `src/artifact.ts` should save the JSON output (change file extension from `.md` to `.json`)

**Updated type definitions**
- Remove `NewsData` (which holds `{ markdown: string }`) and `StockQuote` / `StocksData` from `src/types.ts`
- Add new typed data interfaces: `GreetingData` (keep as-is), `WeatherData` (expand -- see weather requirement), `StockQuoteData`, `StocksModuleData`, `CryptoQuoteData`, `CryptoModuleData`, `NewsArticle`, `NewsModuleData`, `FinanceNewsArticle`, `FinanceNewsModuleData`
- Each data interface should include every field returned by the respective API so Claude has maximum context for formatting
- Add `crypto` and `financeNews` to the `ModuleEntry` id union and update `config.json` defaults accordingly

**Weather module expansion**
- Keep using Open-Meteo; expand the API request to include hourly precipitation probability, wind speed, and humidity for the current day
- Add `forecast_hours` or relevant daily fields so the JSON includes enough data for Claude to describe "tonight's" forecast and precipitation chances
- Return all fetched fields in `WeatherData` -- do not filter or summarize; let Claude interpret the raw data
- Keep `weather-codes.ts` and include the resolved condition string alongside the raw weather code in the output

**Stocks module -- Finnhub**
- Replace the Alpha Vantage implementation entirely; remove all Alpha Vantage code and the `ALPHA_VANTAGE_API_KEY` reference
- Use Finnhub `/quote` endpoint (`https://finnhub.io/api/v1/quote?symbol=X&token=KEY`) for current price (`c`), previous close (`pc`), daily change (`d`), daily change percent (`dp`), high (`h`), low (`l`), open (`o`)
- Use Finnhub `/stock/candle` endpoint with resolution `D` and a `from` timestamp 1 year ago to get the closing price ~1 year ago; compute 1-year dollar and percent change from that historical close vs current price
- Track symbols from `config.stocks` where `type === "stock"`: TSLA, MSTR, ZIP, COIN
- Return per-symbol JSON with: `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`, `high`, `low`, `open`, `previousClose`, `asOf` timestamp
- Env var: `FINNHUB_API_KEY` (fix the typo in current `.env.development` which says `FINHUB_API_KEY`)
- Respect 60 req/min rate limit; fetch symbols sequentially to stay well within the limit

**Crypto module -- CoinGecko (new module)**
- Create `src/modules/crypto.ts` as a new standalone module
- Use CoinGecko `/coins/{id}` or `/simple/price` endpoint to fetch BTC and ETH current price in USD, 24h change, and 24h change percentage
- Use CoinGecko `/coins/{id}/market_chart` with `days=365` to get the price ~1 year ago; compute 1-year dollar and percent change
- Tracked coins should be configurable via `config.json` (add a `crypto` array with `{ id: "bitcoin", symbol: "BTC" }` and `{ id: "ethereum", symbol: "ETH" }`)
- Return per-coin JSON with: `id`, `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`
- Env var: `COINGECKO_API_KEY` (fix the key name in `.env.development` from `COIN_GECKO_API_KEY` to `COINGECKO_API_KEY`)
- Respect 10-30 req/min rate limit; fetch coins sequentially

**News module -- NewsAPI**
- Replace the `claude --print` implementation entirely; remove the `child_process` / `execFile` usage
- Use NewsAPI `/v2/top-headlines` and/or `/v2/everything` endpoints to fetch headlines across categories
- Fetch four category batches: US general news (`country=us`), technology/AI news (`q=artificial+intelligence OR AI`), business news (`category=business`), crypto news (`q=cryptocurrency OR bitcoin OR ethereum`)
- Return a flat array of `NewsArticle` objects, each with: `headline`, `description`, `sourceName`, `sourceUrl`, `publishedAt`, `category` (one of `"us"`, `"tech"`, `"business"`, `"crypto"`)
- Env var: `NEWSAPI_API_KEY` (already present in `.env.development`)
- Respect 100 req/day limit; the four fetches per invocation use 4 requests, which is fine for daily use

**Finance news module -- Finnhub (new module)**
- Create `src/modules/finance-news.ts` as a new standalone module
- Use Finnhub `/news?category=general` endpoint (or `category=forex`, `category=crypto`, `category=merger`) to fetch market/finance news
- Return an array of `FinanceNewsArticle` objects, each with: `headline`, `summary`, `source`, `url`, `datetime`, `category`
- Shares `FINNHUB_API_KEY` and the 60 req/min limit with the stocks module
- Register as module id `financeNews` with type `ancillary`

**Config and module registry updates**
- Add `crypto` and `financeNews` entries to the default `modules` array in `src/config.ts`, both as `ancillary` type
- Add a `crypto` config array alongside the existing `stocks` array in `AppConfig` and `config.json`
- Update the `moduleRegistry` in `src/runner.ts` to include the new `crypto` and `financeNews` module functions
- Separate the `stocks` config array to only contain stock-type symbols (TSLA, MSTR, ZIP, COIN); crypto symbols move to the new `crypto` config array

**API key management**
- All keys loaded from `.env.development` using a consistent pattern; use `dotenv` or a lightweight manual loader at app startup in `src/index.ts` (before modules run)
- Standardize env var names: `FINNHUB_API_KEY`, `COINGECKO_API_KEY`, `NEWSAPI_API_KEY`
- Create `.env.example` in the project root with placeholder values for all three keys
- Remove the `ALPHA_VANTAGE_API_KEY` from `.env.development`
- Each module reads its key via `process.env.VARIABLE_NAME` and throws a clear error if missing

**Update `/today` skill file**
- Update `~/dotfiles/claude/commands/today.md` to: run the app, receive JSON on stdout, and format it into the daily digest
- The skill file must contain the full digest format template (heading, greeting, weather table, markets table with 1Y context, categorized news sections) so Claude knows exactly how to render the JSON
- The skill should instruct Claude to add brief commentary in the weather and markets sections based on the data
- The skill should instruct Claude to deduplicate overlapping headlines between news and finance news
- Include the exact digest format from the product requirements in the skill file as the formatting template

## Visual Design

No visual mockups provided. The final output is terminal-rendered markdown produced by Claude via the `/today` skill. The digest format is defined in the skill file and follows this layout: title with timestamp, greeting, weather table, markets table (6 columns: Asset, Price, Day Chg, Day %, 1Y Chg, 1Y %), and categorized news sections (US News, Finance & Markets, Crypto, AI, Business) each with bold headlines, summaries, and source URLs.

## Existing Code to Leverage

**`src/runner.ts` -- module execution engine**
- The `runModules` function and `moduleRegistry` pattern are well-structured and should be preserved
- Extend the registry with new module ids (`crypto`, `financeNews`) following the same `Record<string, ModuleFn>` pattern
- The core vs ancillary error-handling logic (core failures propagate, ancillary failures log and continue) requires no changes

**`src/config.ts` -- config loader with deep merge**
- The `loadConfig` function and `deepMerge` utility work correctly and should be kept as-is
- Extend the `defaults` object to include the new `crypto` config array and new module entries
- The deep merge logic already handles nested objects and array overrides from `config.json`

**`src/modules/weather.ts` -- Open-Meteo fetch pattern**
- The URL construction with `URLSearchParams`, `fetch` call, response validation, and typed return pattern is the template for all new modules
- Expand the params to request additional weather fields but keep the same structural approach
- Keep the `weather-codes.ts` import and condition resolution

**`src/logger.ts` -- error logging**
- The `logError(moduleId, error)` function writes timestamped entries to `logs/errors.log`
- No changes needed; all modules already use this through the runner's error handling

**`src/types.ts` -- module contract types**
- `ModuleResult`, `ModuleFn`, `ModuleEntry`, and `AppConfig` define the module contract and should be preserved
- Existing `GreetingData` shape is already JSON-friendly and needs no changes
- `WeatherData` needs additional fields but the same structural pattern applies

## Out of Scope

- Fallback API support (roadmap item 13) -- modules use a single provider each; no retry-with-alternate-provider logic
- Calendar integration (roadmap item 14)
- Additional news sources beyond NewsAPI and Finnhub (roadmap item 15)
- Any calls to the Claude API or `claude` CLI from within the app -- the app is a pure data aggregator
- Caching or persistence of API responses between runs
- User-facing configuration UI or interactive prompts
- Authentication or multi-user support
- Deployment, CI/CD, or packaging for distribution
- Unit tests (tests will be addressed separately; this spec covers production code only)
- Real-time or streaming data (the app runs once per invocation and exits)
