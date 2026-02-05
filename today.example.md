---
allowed-tools: Bash(npx tsx:*)
description: Run a personal daily briefing that returns JSON data, then format it into a rich digest with weather, markets, and news
---

## Your task

Run the daily briefing app and format the JSON output into a rich daily digest for the user.

### Step 1: Run the app

Execute the following command:

```
cd <path-to-claude-command-today> && npx tsx src/index.ts
```

### Step 2: Handle the output

The app writes a **JSON object** to stdout (not markdown). Do NOT display the raw JSON to the user.

**Error handling:**
- If the command exits with a non-zero exit code, the stdout will contain an error JSON object (e.g., `{ "error": true, "coreFailures": [...] }`). Display this error to the user clearly and stop.
- If the command succeeds but a module section is missing from the JSON (e.g., no `crypto` key, no `financeNews` key), skip that section gracefully in the formatted output. Do not mention the missing section.

### Step 3: Parse and format the digest

Parse the JSON object. It contains the following top-level keys (any may be absent):

- `greeting` -- `{ greeting: string, date: string }`
- `weather` -- `{ currentTemp, condition, high, low, unit, weatherCode, windSpeed, windDirection, humidity, hourlyTime[], hourlyTemperature[], hourlyPrecipitationProbability[], hourlyWindSpeed[], hourlyHumidity[], location }`
- `stocks` -- `{ quotes: [{ symbol, currentPrice, dailyChange, dailyChangePercent, twoWeekAgoPrice, twoWeekChange, twoWeekChangePercent, yearAgoPrice, yearChange, yearChangePercent, high, low, open, previousClose }], asOf }`
- `crypto` -- `{ coins: [{ id, symbol, currentPrice, dailyChange, dailyChangePercent, twoWeekAgoPrice, twoWeekChange, twoWeekChangePercent, yearAgoPrice, yearChange, yearChangePercent }] }`
- `news` -- `{ articles: [{ headline, description, sourceName, sourceUrl, publishedAt, category }] }` where category is one of: `"us"`, `"tech"`, `"business"`, `"crypto"`
- `financeNews` -- `{ articles: [{ headline, summary, source, url, datetime, category }] }`

Format the data into the digest using the template below. Follow the template structure exactly.

### Formatting rules

- For the Markets table, combine stocks (`stocks.quotes`) and crypto (`crypto.coins`) into a single table. List stocks first, then crypto.
- Format prices with `$` prefix. Use commas for thousands. Round to 2 decimal places for stocks, whole dollars for crypto above $1000.
- Prefix positive changes with `+`, negative changes show their `-` naturally.
- For Day %, 2W %, and 1Y %, format as percentages with 1 decimal place and a `+`/`-` prefix.
- In the Markets commentary (2-3 sentences after the table), highlight notable movers -- largest gainers/losers by percentage, any asset moving more than 5% in a day, notable 2-week swings, or notable year-over-year trends.
- For News sections, organize articles by category. Deduplicate overlapping headlines between `news` and `financeNews` data -- if two articles cover the same story, keep the one with the better summary and drop the other.
- Place `financeNews` articles under the "Finance & Markets" section. Place `news` articles under their respective category sections (US News, Crypto, AI, Business) based on their `category` field: `"us"` -> US News, `"tech"` -> AI, `"business"` -> Business, `"crypto"` -> Crypto.
- Limit each news category to the 5 most relevant/recent articles.
- For weather commentary, use the hourly data to describe tonight's forecast, precipitation chances, and any notable conditions. Keep it to 1-2 sentences.
- For the greeting, use the `greeting` field from the greeting data. You may add a brief positive or quippy note about the day.

---

## Digest Format Template

```
# Daily Briefing -- [Day], [Month] [Date], [Year] [Time AM/PM]

[greeting text from greeting data]. [Insert a brief positive or quippy note about the day]

---
## Weather -- [location from weather data]

**Currently:** [currentTemp][unit], [condition]
+----------------+--------------------------------------------------------+
| **High**       | [high]                                                 |
| **Low**        | [low]                                                  |
| **Conditions** | [detailed conditions for the day using hourly data]    |
| **Tonight**    | [evening/overnight forecast with precipitation chance] |
+----------------+--------------------------------------------------------+
[Brief weather commentary - 1-2 sentences about what to expect, using hourly precipitation probability, wind, and humidity data]

---
## Markets

[Context about when prices are from using stocks.asOf timestamp, and whether markets are open/closed]
+-------+---------+---------+-------+-------+----------+--------+
| Asset |  Price  | Day Chg | Day % | 2W % |  1Y Chg  |  1Y %  |
+-------+---------+---------+-------+-------+----------+--------+
| AAPL  | $198.50 |  +$3.20 | +1.6% | +2.4% |  +$28.50 | +16.8% |
| GOOGL | $175.30 |  -$1.10 | -0.6% | -1.8% |  +$32.10 | +22.4% |
| BTC   | $82,521 | -$2,380 | -2.8% | +4.1% | -$19,884 | -19.4% |
| ETH   |  $2,688 |   -$134 | -4.7% | -2.6% |    -$637 | -19.2% |
+-------+---------+---------+-------+-------+----------+--------+
[Brief market commentary - 2-3 sentences analyzing notable movers, trends, and standout performers or laggards]

---
## News Digest

### US News
- **[Headline].** [1-2 sentence summary from description]. ([source URL])
- **[Headline].** [Summary]. ([source URL])

### Finance & Markets
- **[Headline].** [Summary from financeNews data]. ([source URL])
- **[Headline].** [Summary]. ([source URL])

### Crypto
- **[Headline].** [Summary]. ([source URL])

### AI
- **[Headline].** [Summary]. ([source URL])

### Business
- **[Headline].** [Summary]. ([source URL])
```

**Important notes on the template:**
- The table borders shown above are illustrative. Use proper Unicode box-drawing characters for clean rendering in the terminal.
- The sample values (AAPL $198.50, BTC $82,521, etc.) are examples only. Use the actual data from the JSON.
- If a news category has zero articles after deduplication, omit that category section entirely.
- The timestamp in the title should reflect the current time when you format the digest.
