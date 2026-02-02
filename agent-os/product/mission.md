# Product Mission

## Pitch

Claude `/today` is a personal daily briefing command for Claude Code that gives Name a concise, actionable summary of what he needs to know each morning -- weather, markets, and top news -- without leaving the terminal. The app aggregates raw data from multiple APIs and outputs structured JSON; Claude handles all formatting and commentary via the `/today` skill.

## Users

### Primary Customer
- **Name (solo user):** A developer who starts the day in the terminal and wants a single command to surface the information that matters before diving into work.

### User Persona
**Name** (developer, daily user)
- **Role:** Software engineer working from the terminal
- **Context:** Begins each workday in Claude Code; wants a quick situational overview without switching to browsers, apps, or email
- **Pain Points:** Checking weather, scanning newsletters, and reviewing market data each require separate apps and context switches; morning newsletter emails pile up unread because the relevant signal is buried among ads, quizzes, and promotions
- **Goals:** A single command that delivers a clean, distraction-free morning briefing in under 30 seconds

## The Problem

### Morning Context Is Scattered and Noisy
Starting the day informed currently requires visiting multiple sources -- a weather app, an email inbox, a finance site. Each source is padded with ads, upsells, and irrelevant content. The result is either wasted time or skipped updates.

**Our Solution:** A single `/today` command that fetches and aggregates the day's essentials from dedicated APIs, outputs structured JSON, and lets Claude format a polished digest directly in the terminal. Each information source is handled by a dedicated module that extracts only the signal and discards the noise.

## Differentiators

### Terminal-Native Daily Briefing
Unlike opening a browser or scanning an inbox, `/today` delivers a curated briefing inside the tool Name already has open. There is zero context switching and zero ad content.

### Data Aggregator + AI Presentation Layer
Unlike tools that bake formatting into the data pipeline, the app cleanly separates data collection (fast, cheap API calls returning JSON) from presentation (Claude formats the final digest). This makes the system faster, cheaper, and easier to extend -- new data sources only need to return JSON, and the presentation adapts automatically.

### Extensible Module Architecture
Adding a new information source (calendar, tasks, Hacker News, etc.) means adding a single module file that returns JSON -- no rewiring required. The architecture also supports future fallback APIs so a provider outage does not break the briefing.

## Key Features

### Core Modules
- **Greeting:** A personalized good-morning message with the current date so every briefing feels oriented in time
- **Weather:** Current conditions, high/low temps, and tonight's forecast for Venice Beach, CA so Name can plan the day without checking a weather app

### Ancillary Modules
- **Stocks:** Real-time quotes and daily change for tracked equities (TSLA, MSTR, ZIP, COIN) plus 1-year historical context so Name sees both the current price and the bigger trend
- **Crypto:** Live prices and daily movement for BTC and ETH so Name stays current on crypto without visiting an exchange
- **News:** A categorized digest of US news, finance/markets, crypto, AI, and business headlines with source links so Name gets the day's signal in one place

### Architecture
- **JSON-Out Design:** Every module returns structured JSON; the app outputs combined JSON to stdout. Claude formats the final Markdown digest via the `/today` skill, keeping the app fast and cheap
- **Module System:** A plug-in architecture where each briefing section is an independent module, making it straightforward to add, remove, or reorder sections over time
- **Graceful Degradation:** Core module failures stop the briefing; ancillary module failures are logged and the briefing continues without them
- **Configuration:** User-level settings (name, location, enabled modules, stock symbols) stored in a JSON config file so the command works out of the box but remains customizable
