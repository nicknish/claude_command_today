# Task Breakdown: JSON-Out Architecture Refactor

## Overview
Total Tasks: 42

This is a refactor of an existing codebase. The project currently outputs formatted markdown from the app itself. The refactor changes the app into a pure JSON data aggregator, replaces two API providers (Alpha Vantage stocks, `claude --print` news), adds two new modules (crypto, finance news), and rewrites the `/today` skill so Claude handles all formatting.

## Task List

### Foundation: Types, Core Pipeline, and Environment

#### Task Group 1: Type Definitions and Data Contracts
**Dependencies:** None

This group establishes every data interface the rest of the refactor depends on. All subsequent task groups import from `src/types.ts`, so this must be completed first.

- [x] 1.0 Complete type definitions refactor
  - [x] 1.1 Remove obsolete types from `src/types.ts`
    - Remove `StockQuote` (the Alpha Vantage quote shape)
    - Remove `StocksData` (the `{ quotes: StockQuote[], asOf }` wrapper)
    - Remove `NewsData` (the `{ markdown: string }` shape)
    - Keep `ModuleResult`, `ModuleFn`, `ModuleEntry`, `AppConfig`, `GreetingData`, `WeatherData`, `StockSymbol`
  - [x] 1.2 Add new market data interfaces to `src/types.ts`
    - `StockQuoteData`: `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`, `high`, `low`, `open`, `previousClose`
    - `StocksModuleData`: `{ quotes: StockQuoteData[], asOf: string }`
    - `CryptoQuoteData`: `id`, `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`
    - `CryptoModuleData`: `{ coins: CryptoQuoteData[] }`
  - [x] 1.3 Add new news data interfaces to `src/types.ts`
    - `NewsArticle`: `headline`, `description`, `sourceName`, `sourceUrl`, `publishedAt`, `category` (union: `"us" | "tech" | "business" | "crypto"`)
    - `NewsModuleData`: `{ articles: NewsArticle[] }`
    - `FinanceNewsArticle`: `headline`, `summary`, `source`, `url`, `datetime`, `category`
    - `FinanceNewsModuleData`: `{ articles: FinanceNewsArticle[] }`
  - [x] 1.4 Expand `WeatherData` with hourly and forecast fields
    - Keep existing fields: `currentTemp`, `condition`, `high`, `low`, `unit`
    - Add: `weatherCode` (raw numeric code), `windSpeed`, `windDirection`, `humidity` (current values)
    - Add: hourly arrays for the current day -- `hourlyTime`, `hourlyTemperature`, `hourlyPrecipitationProbability`, `hourlyWindSpeed`, `hourlyHumidity`
    - Add: `location` (string label from config)
  - [x] 1.5 Add `CryptoSymbol` type and extend `AppConfig`
    - Add `CryptoSymbol`: `{ id: string, symbol: string }` (e.g., `{ id: "bitcoin", symbol: "BTC" }`)
    - Add optional `crypto?: CryptoSymbol[]` field to `AppConfig`
  - [x] 1.6 Expand `ModuleEntry` id union
    - Add `"crypto"` and `"financeNews"` as valid module id values
    - This can be a string-literal union type or remain a plain `string` -- match the existing pattern

**Acceptance Criteria:**
- `src/types.ts` compiles with zero errors
- All old Alpha Vantage / markdown-specific types are removed
- Every new data interface includes all fields specified in the spec
- `AppConfig` has both `stocks` and `crypto` config arrays

---

#### Task Group 2: Environment and Config Updates
**Dependencies:** Task Group 1

Updates `.env.development`, creates `.env.example`, adds `dotenv` loading to the entry point, and extends `config.json` and `src/config.ts` with the new module and crypto config entries.

- [x] 2.0 Complete environment and config updates
  - [x] 2.1 Fix env var names in `.env.development`
    - Rename `FINHUB_API_KEY` to `FINNHUB_API_KEY` (fix the typo)
    - Rename `COIN_GECKO_API_KEY` to `COINGECKO_API_KEY`
    - Remove `ALPHA_VANTAGE_API_KEY` line entirely
    - Keep `NEWSAPI_API_KEY` as-is (already correct)
  - [x] 2.2 Create `.env.example` in the project root
    - Include placeholder lines for `FINNHUB_API_KEY`, `COINGECKO_API_KEY`, `NEWSAPI_API_KEY`
    - Use placeholder values like `your_key_here`
  - [x] 2.3 Add dotenv loading to `src/index.ts`
    - Install `dotenv` package via pnpm, or use a lightweight manual `.env` loader
    - Load `.env.development` at the top of `main()` before any modules run
    - Ensure `process.env` is populated before `runModules` is called
  - [x] 2.4 Update `config.json` with new module entries and crypto config
    - Add `{ "id": "crypto", "enabled": true, "type": "ancillary" }` to the modules array
    - Add `{ "id": "financeNews", "enabled": true, "type": "ancillary" }` to the modules array
    - Remove BTC and ETH entries from the `stocks` array (they move to `crypto`)
    - Add a new `crypto` top-level array: `[{ "id": "bitcoin", "symbol": "BTC" }, { "id": "ethereum", "symbol": "ETH" }]`
    - Add `{ "symbol": "ZIP", "name": "ZipRecruiter", "type": "stock" }` and `{ "symbol": "COIN", "name": "Coinbase", "type": "stock" }` to `stocks` if not already present
  - [x] 2.5 Update `src/config.ts` defaults to match `config.json` changes
    - Add `crypto` and `financeNews` entries to the default `modules` array
    - Add a default `crypto` array with BTC and ETH entries
    - Update the default `stocks` array to contain only stock-type symbols (TSLA, MSTR, ZIP, COIN)
    - Keep `loadConfig` and `deepMerge` functions unchanged

**Acceptance Criteria:**
- `.env.development` has corrected key names and no Alpha Vantage reference
- `.env.example` exists with all three placeholder keys
- `config.json` has six modules (greeting, weather, stocks, crypto, news, financeNews) and separate stocks/crypto arrays
- `src/config.ts` defaults mirror the updated `config.json` structure
- Environment variables load before modules execute

---

#### Task Group 3: Core Pipeline Refactor (index.ts, artifact.ts, formatter removal)
**Dependencies:** Task Groups 1 and 2

Rewires the main entry point to output JSON instead of markdown, updates artifact saving, and removes the formatter.

- [x] 3.0 Complete core pipeline refactor
  - [x] 3.1 Rewrite `main()` in `src/index.ts` to output JSON
    - After `runModules` returns, assemble a top-level JSON object keyed by module id
    - For each successful result, set `output[result.id] = result.data`
    - Omit failed ancillary modules from the JSON output entirely (they are already logged by the runner)
    - If any core module failed, write an error JSON object to stdout (e.g., `{ error: true, coreFailures: [...] }`) and call `process.exit(1)`
    - For the success path, write `JSON.stringify(output, null, 2)` to stdout
  - [x] 3.2 Update `src/artifact.ts` to save JSON files
    - Change `generateFilename()` to produce `.json` extension instead of `.md`
    - Rename the parameter from `markdown` to `json` (or `content`) for clarity
    - Keep everything else (directory creation, timestamped filename, writeFileSync) the same
  - [x] 3.3 Update `main()` to call `saveArtifact` with the JSON string
    - Pass the stringified JSON to `saveArtifact` instead of the old markdown string
  - [x] 3.4 Delete `src/formatter.ts`
    - Remove the file entirely
    - Remove the `import { formatBriefing } from "./formatter.js"` line from `src/index.ts`
    - Confirm no other files import from `formatter.ts`
  - [x] 3.5 Verify the pipeline compiles and runs
    - Run `npx tsc --noEmit` to confirm zero type errors across the project
    - Note: at this point, `stocks` and `news` modules still have old implementations that will be replaced in later task groups; the pipeline should still compile because `ModuleResult.data` is typed as `unknown`

**Acceptance Criteria:**
- `src/formatter.ts` is deleted and no imports reference it
- `main()` outputs a JSON object to stdout (not markdown)
- Artifacts are saved as `.json` files in the `artifacts/` directory
- Core module failures cause `process.exit(1)` with error JSON
- Ancillary module failures are silently omitted from the JSON output
- The project compiles with zero type errors

---

### Module Implementations

#### Task Group 4: Weather Module Expansion
**Dependencies:** Task Group 1 (needs expanded `WeatherData` type)

Expands the existing Open-Meteo request to include hourly data and additional current fields. This is a modification of the existing working module, not a rewrite.

- [x] 4.0 Complete weather module expansion
  - [x] 4.1 Expand Open-Meteo API parameters in `src/modules/weather.ts`
    - Add hourly parameters: `hourly=temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m`
    - Add current weather parameters: `current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m`
    - Keep existing params: `daily=temperature_2m_max,temperature_2m_min`, `timezone=auto`
    - Increase `forecast_days` to `"2"` so hourly data covers "tonight" even when run in the evening
  - [x] 4.2 Parse the expanded API response
    - Extract current wind speed, wind direction, and humidity from the response
    - Extract hourly arrays for the current day (time, temperature, precipitation probability, wind speed, humidity)
    - Filter hourly arrays to include only the current calendar day's entries (or keep all and let Claude interpret)
  - [x] 4.3 Return the expanded `WeatherData` object
    - Populate all new fields: `weatherCode`, `windSpeed`, `windDirection`, `humidity`, hourly arrays, `location`
    - Keep returning the existing fields (`currentTemp`, `condition`, `high`, `low`, `unit`) unchanged
    - Include both the raw `weatherCode` number and the resolved `condition` string (from `weather-codes.ts`)

**Acceptance Criteria:**
- The weather module fetches hourly precipitation, wind, and humidity data alongside existing fields
- The returned `WeatherData` includes all fields needed for Claude to describe current conditions, tonight's forecast, and precipitation chances
- The `weather-codes.ts` file is unchanged and still used for condition resolution
- The module compiles and returns valid JSON when run

---

#### Task Group 5: Stocks Module Replacement (Finnhub)
**Dependencies:** Task Groups 1 and 2 (needs `StockQuoteData`/`StocksModuleData` types and `FINNHUB_API_KEY` env var)

Completely replaces the Alpha Vantage stocks implementation with Finnhub. This is a full rewrite of `src/modules/stocks.ts`.

- [x] 5.0 Complete stocks module replacement
  - [x] 5.1 Rewrite `src/modules/stocks.ts` -- remove all Alpha Vantage code
    - Remove `ALPHA_VANTAGE_BASE` constant, `getApiKey()` referencing `ALPHA_VANTAGE_API_KEY`, `fetchStockQuote`, and `fetchCryptoQuote`
    - Start fresh with Finnhub base URL and `FINNHUB_API_KEY` env var lookup
    - Throw a clear error if `FINNHUB_API_KEY` is missing from `process.env`
  - [x] 5.2 Implement Finnhub `/quote` fetching
    - For each symbol in `config.stocks` where `type === "stock"`, call `https://finnhub.io/api/v1/quote?symbol={SYMBOL}&token={KEY}`
    - Parse response fields: `c` (current), `pc` (previous close), `d` (daily change), `dp` (daily change percent), `h` (high), `l` (low), `o` (open)
    - Fetch symbols sequentially to respect the 60 req/min rate limit
  - [x] 5.3 Implement Finnhub `/stock/candle` fetching for 1-year historical data
    - For each symbol, call `/stock/candle` with `resolution=D`, `from` set to Unix timestamp of ~1 year ago, `to` set to current Unix timestamp
    - Extract the first closing price from the `c` (close) array as the year-ago price
    - Compute `yearChange` (current price minus year-ago close) and `yearChangePercent`
  - [x] 5.4 Assemble and return `StocksModuleData`
    - Build a `StockQuoteData` object per symbol with all fields: `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`, `high`, `low`, `open`, `previousClose`
    - Include an `asOf` ISO timestamp
    - Return `{ id: "stocks", success: true, data: { quotes: [...], asOf } }`

**Acceptance Criteria:**
- No Alpha Vantage code or `ALPHA_VANTAGE_API_KEY` references remain in `stocks.ts`
- The module fetches current quote + 1-year historical data from Finnhub for each configured stock symbol
- Symbols are fetched sequentially (not in parallel) to respect rate limits
- The returned data includes daily and yearly change metrics for each symbol
- Missing `FINNHUB_API_KEY` throws a descriptive error

---

#### Task Group 6: Crypto Module (CoinGecko -- new file)
**Dependencies:** Task Groups 1 and 2 (needs `CryptoQuoteData`/`CryptoModuleData` types and `COINGECKO_API_KEY` env var)

Brand new module. Follow the structural pattern from the weather module (URL construction with params, fetch, response validation, typed return).

- [x] 6.0 Complete crypto module
  - [x] 6.1 Create `src/modules/crypto.ts` scaffold
    - Export `cryptoModule` function with signature `(config: AppConfig) => Promise<ModuleResult>`
    - Read `COINGECKO_API_KEY` from `process.env`; throw a clear error if missing
    - Read coin list from `config.crypto` (default: BTC and ETH)
  - [x] 6.2 Implement CoinGecko current price fetching
    - Use `/simple/price` or `/coins/{id}` endpoint to get current USD price, 24h change, and 24h change percentage for each coin
    - Pass API key via `x_cg_demo_api_key` query parameter or `x-cg-demo-api-key` header (check CoinGecko docs for the demo key auth method)
    - Fetch coins sequentially to respect the 10-30 req/min rate limit
  - [x] 6.3 Implement CoinGecko 1-year historical price fetching
    - Use `/coins/{id}/market_chart?vs_currency=usd&days=365` to get historical price data
    - Extract the earliest price point from the response as the year-ago price
    - Compute `yearChange` and `yearChangePercent` from year-ago price vs current price
  - [x] 6.4 Assemble and return `CryptoModuleData`
    - Build a `CryptoQuoteData` object per coin with: `id`, `symbol`, `currentPrice`, `dailyChange`, `dailyChangePercent`, `yearAgoPrice`, `yearChange`, `yearChangePercent`
    - Return `{ id: "crypto", success: true, data: { coins: [...] } }`

**Acceptance Criteria:**
- `src/modules/crypto.ts` exists as a new standalone module file
- The module fetches current prices and 1-year historical data from CoinGecko for configured coins
- Coins are fetched sequentially to respect rate limits
- Missing `COINGECKO_API_KEY` throws a descriptive error
- The returned data matches the `CryptoModuleData` shape

---

#### Task Group 7: News Module Replacement (NewsAPI)
**Dependencies:** Task Groups 1 and 2 (needs `NewsArticle`/`NewsModuleData` types and `NEWSAPI_API_KEY` env var)

Completely replaces the `claude --print` news implementation with direct NewsAPI calls. This is a full rewrite of `src/modules/news.ts`.

- [x] 7.0 Complete news module replacement
  - [x] 7.1 Rewrite `src/modules/news.ts` -- remove all `claude --print` code
    - Remove `child_process` / `execFile` imports and the `NEWS_PROMPT` constant
    - Start fresh with NewsAPI base URLs and `NEWSAPI_API_KEY` env var lookup
    - Throw a clear error if `NEWSAPI_API_KEY` is missing from `process.env`
  - [x] 7.2 Implement four category fetches from NewsAPI
    - US general news: `/v2/top-headlines?country=us`
    - Tech/AI news: `/v2/everything?q=artificial+intelligence+OR+AI`
    - Business news: `/v2/top-headlines?category=business&country=us`
    - Crypto news: `/v2/everything?q=cryptocurrency+OR+bitcoin+OR+ethereum`
    - Pass API key via `apiKey` query parameter
    - Tag each article with its `category` (`"us"`, `"tech"`, `"business"`, `"crypto"`)
  - [x] 7.3 Parse and normalize articles into `NewsArticle` objects
    - Map NewsAPI response fields to `NewsArticle`: `title` -> `headline`, `description` -> `description`, `source.name` -> `sourceName`, `url` -> `sourceUrl`, `publishedAt` -> `publishedAt`
    - Assign the `category` field based on which fetch produced the article
    - Filter out articles with null/empty titles
  - [x] 7.4 Return flat `NewsModuleData` array
    - Combine all category results into a single flat `articles` array
    - Return `{ id: "news", success: true, data: { articles: [...] } }`

**Acceptance Criteria:**
- No `child_process`, `execFile`, or `claude` CLI references remain in `news.ts`
- The module fetches headlines from four NewsAPI category queries
- Each article includes `headline`, `description`, `sourceName`, `sourceUrl`, `publishedAt`, and `category`
- Missing `NEWSAPI_API_KEY` throws a descriptive error
- The returned data matches the `NewsModuleData` shape

---

#### Task Group 8: Finance News Module (Finnhub -- new file)
**Dependencies:** Task Groups 1 and 2 (needs `FinanceNewsArticle`/`FinanceNewsModuleData` types and `FINNHUB_API_KEY` env var)

Brand new module. Shares the Finnhub API key with the stocks module.

- [x] 8.0 Complete finance news module
  - [x] 8.1 Create `src/modules/finance-news.ts` scaffold
    - Export `financeNewsModule` function with signature `(config: AppConfig) => Promise<ModuleResult>`
    - Read `FINNHUB_API_KEY` from `process.env`; throw a clear error if missing
  - [x] 8.2 Implement Finnhub `/news` endpoint fetching
    - Call `https://finnhub.io/api/v1/news?category=general&token={KEY}`
    - Parse response array of news items
    - Map Finnhub fields to `FinanceNewsArticle`: `headline`, `summary`, `source`, `url`, `datetime` (Unix timestamp -- convert to ISO string), `category`
  - [x] 8.3 Return `FinanceNewsModuleData`
    - Wrap the articles array in `{ articles: [...] }`
    - Return `{ id: "financeNews", success: true, data: { articles: [...] } }`

**Acceptance Criteria:**
- `src/modules/finance-news.ts` exists as a new standalone module file
- The module fetches market/finance news from Finnhub
- Each article includes `headline`, `summary`, `source`, `url`, `datetime`, and `category`
- Missing `FINNHUB_API_KEY` throws a descriptive error
- The module is registered with id `financeNews` and type `ancillary`

---

### Integration: Runner and Skill

#### Task Group 9: Runner Registry Update
**Dependencies:** Task Groups 5, 6, 7, and 8 (all module files must exist for import)

Wires the new and replacement modules into the runner's module registry.

- [x] 9.0 Complete runner registry update
  - [x] 9.1 Add imports for new modules in `src/runner.ts`
    - Add `import { cryptoModule } from "./modules/crypto.js"`
    - Add `import { financeNewsModule } from "./modules/finance-news.js"`
    - Keep existing imports for `greetingModule`, `weatherModule`, `stocksModule`, `newsModule`
  - [x] 9.2 Register new modules in `moduleRegistry`
    - Add `crypto: cryptoModule` entry
    - Add `financeNews: financeNewsModule` entry
    - Final registry should have six entries: greeting, weather, stocks, crypto, news, financeNews

**Acceptance Criteria:**
- `src/runner.ts` imports and registers all six module functions
- The registry keys match the module ids used in `config.json` and `src/config.ts` defaults
- No orphaned imports or missing module references

---

#### Task Group 10: `/today` Skill File Rewrite
**Dependencies:** Task Groups 3 and 9 (the app must output JSON and all modules must be registered)

Rewrites the Claude Code skill file so it receives JSON from the app and formats the final daily digest.

- [x] 10.0 Complete `/today` skill rewrite
  - [x] 10.1 Rewrite `~/dotfiles/claude/commands/today.md` with JSON-handling instructions
    - Keep the frontmatter `allowed-tools` and `description` fields (update description if needed)
    - Instruct Claude to run the app: `cd /Users/name/git/repos/claude_command_today && npx tsx src/index.ts`
    - Instruct Claude that stdout is a JSON object, not markdown
    - Instruct Claude to parse the JSON and format it into the digest using the template below
  - [x] 10.2 Include the full digest format template in the skill file
    - Title with current timestamp
    - Greeting section (from `greeting` data)
    - Weather section as a summary table with current conditions, high/low, wind, humidity, and a brief commentary on tonight's forecast and precipitation chances
    - Markets section as a 6-column table: Asset, Price, Day Chg, Day %, 1Y Chg, 1Y % -- covering both stocks and crypto data
    - Instruct Claude to add brief commentary on notable movers in the markets section
    - News sections organized by category: US News, Finance & Markets (from financeNews data), Crypto, AI/Tech, Business
    - Each news item: bold headline, 1-2 sentence summary, source link
    - Instruct Claude to deduplicate overlapping headlines between news and financeNews data
  - [x] 10.3 Add error handling instructions to the skill file
    - If the app exits with non-zero code, display the error JSON to the user
    - If a module section is missing from the JSON (ancillary failure), skip that section gracefully

**Acceptance Criteria:**
- The skill file at `~/dotfiles/claude/commands/today.md` contains the full formatting template
- Running `/today` in Claude Code executes the app, receives JSON, and produces a formatted markdown digest
- The digest includes all sections: greeting, weather, markets (stocks + crypto), and categorized news
- Claude is instructed to add commentary and deduplicate headlines
- Error cases are handled gracefully

---

### Final Verification

#### Task Group 11: End-to-End Verification
**Dependencies:** All previous task groups

A final manual check that the full pipeline works from app execution to formatted output.

- [x] 11.0 Complete end-to-end verification
  - [x] 11.1 Verify the app compiles cleanly
    - Run `npx tsc --noEmit` from the project root
    - Confirm zero type errors
  - [x] 11.2 Run the app directly and verify JSON output
    - Run `npx tsx src/index.ts` from the project root
    - Confirm stdout is valid JSON with keys: `greeting`, `weather`, `stocks`, `crypto`, `news`, `financeNews`
    - Confirm an artifact `.json` file is saved to `artifacts/`
  - [x] 11.3 Verify no residual references to removed code
    - Confirm `src/formatter.ts` does not exist
    - Confirm no file imports from `./formatter.js`
    - Confirm no references to `ALPHA_VANTAGE_API_KEY` in any source file
    - Confirm no `child_process` or `execFile` usage in `src/modules/news.ts`
  - [x] 11.4 Run biome lint check
    - Run `npx biome check .` and resolve any lint/format issues

**Acceptance Criteria:**
- The project compiles with zero errors
- The app outputs valid JSON to stdout containing all six module results
- Artifacts are saved as `.json` files
- No dead code references to the formatter, Alpha Vantage, or `claude --print`
- Biome lint passes cleanly

## Execution Order

The recommended implementation sequence accounts for dependencies between task groups. Groups at the same level in the list can be executed in parallel.

```
1. Task Group 1  -- Type definitions (no dependencies; everything else depends on this)
2. Task Group 2  -- Environment and config (depends on 1)
3. Task Group 3  -- Core pipeline refactor (depends on 1, 2)
4. Task Groups 4, 5, 6, 7, 8  -- All five module implementations (depend on 1, 2; can run in parallel)
5. Task Group 9  -- Runner registry wiring (depends on 4-8; all modules must exist)
6. Task Group 10 -- /today skill rewrite (depends on 3, 9)
7. Task Group 11 -- End-to-end verification (depends on all above)
```

Note: Task Group 3 (core pipeline) and Task Groups 4-8 (modules) can technically proceed in parallel after Groups 1-2 are done, since `ModuleResult.data` is typed as `unknown` and the pipeline does not need to know the concrete data shapes. However, Group 9 (runner wiring) must wait for all modules to exist before it can import them.
