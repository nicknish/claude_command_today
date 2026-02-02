# Spec Requirements: /today Command

## Initial Description
A Claude Code `/today` command that provides a personal daily briefing. It includes three modules: greeting (greets user by name), weather (local weather for today), and Morning Brew newsletter summary (markets, top news, market news -- skipping ads, quiz, recommendations, games). The architecture should be extensible to support adding more modules over time. Built with TypeScript and Biome.js.

## Requirements Discussion

### First Round Questions

**Q1:** For the module system architecture, should each module export a standard interface and be discovered from a known directory, or should modules explicitly register themselves via a registry pattern?
**Answer:** Single file that runs all modules (not a self-registering pattern). A central runner file imports and executes each module in order. This keeps debugging simple while maintaining code organization with separate module files.

**Q2:** For the greeting module, should the time-of-day greeting adjust (morning/afternoon/evening), and should the format be like "Good morning, Name! Today is Thursday, January 30, 2026."?
**Answer:** Confirmed -- time-of-day greeting (morning/afternoon/evening) with format like "Good morning, Name! Today is Thursday, January 30, 2026."

**Q3:** For the weather module, which API should we use, what location should default, and should temperature be Fahrenheit or Celsius?
**Answer:** Default city is Venice Beach, CA. Use Fahrenheit by default but make it configurable.

**Q4:** For Morning Brew parsing, how concise should summaries be, and should the Markets section be raw numbers or prose?
**Answer:** Short paragraph summaries for news items. For Markets section, produce a markdown table with columns for: Type (Nasdaq, S&P, Dow, 10-Year, Bitcoin, Ethereum, etc.), Value, and Percentage Change.

**Q5:** For Claude Code skill integration, should the TypeScript produce Markdown directly, or structured output that gets converted?
**Answer:** TypeScript produces structured output, then a final step converts to Markdown. Separation of concerns between module execution and Markdown formatting.

**Q6:** For the config file, should it be `config.json` at the project root?
**Answer:** `config.json` at project root confirmed.

**Q7:** For error handling, should the command ever fail completely, or always succeed showing whatever modules worked?
**Answer:** Core module failures should show the error message and stack trace. Ancillary module failures should be logged to a log file rather than shown in the briefing output.

**Q8:** Is there anything explicitly out of scope for the initial build?
**Answer:** Nothing explicitly excluded -- full initial build desired.

**Additional requirements volunteered by user:**
- Create an artifact (saved output file) every time the `/today` command runs
- Recommend libraries, tools, or methodologies where appropriate

### Existing Code to Reference

No similar existing features identified for reference. This is a greenfield project. The existing `.claude/commands/` and `.claude/skills/` directories in the repo are for the agent-os orchestration system, not for the `/today` command itself.

### Follow-up Questions

**Follow-up 1:** Artifact storage -- format and location. Where should the saved output files go? What filename format? Should it overwrite or create new files on repeated runs?
**Answer:** `artifacts/` directory at project root, using `YYYY-MM-DD-HH-MM-SS.md` filename format. Save the final Markdown output.

**Follow-up 2:** Error logging destination for ancillary module failures.
**Answer:** Log ancillary module failures to a log file (e.g., `logs/errors.log`).

**Follow-up 3:** Core vs. ancillary module classification -- which modules fall into which category?
**Answer:** Confirmed:
- Core: Greeting, Weather (show error + stack trace on failure)
- Ancillary: Morning Brew (log errors silently to log file, don't disrupt briefing)

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements
- Central runner file imports and executes each module in order (no self-registration or dynamic discovery)
- Greeting module: time-of-day greeting (morning/afternoon/evening) with user's name and full date including day of week
- Weather module: fetches current conditions and forecast for Venice Beach, CA using a free API (Open-Meteo or wttr.in); displays temperature in Fahrenheit (configurable), conditions, and high/low
- Morning Brew module: fetches latest issue from morningbrew.com/issues/latest, parses HTML with Cheerio, extracts Markets (as markdown table with Type/Value/Percentage Change columns), Top News (short paragraph summaries), and Market News (short paragraph summaries); strips ads, quizzes, recommendations, and games
- TypeScript produces structured output per module; a separate formatting step converts structured output to Markdown
- Artifact saved to `artifacts/YYYY-MM-DD-HH-MM-SS.md` on every run (final Markdown output)
- Config stored in `config.json` at project root with fields: name, location, temperature unit, enabled/ordered modules list; sensible defaults so it works without configuration

### Reusability Opportunities
- No existing features identified to reuse; greenfield project
- Recommend libraries and tools where appropriate (e.g., Cheerio for HTML parsing, Open-Meteo for weather)

### Scope Boundaries
**In Scope:**
- Module runner and output formatter
- Greeting module
- Weather module
- Morning Brew fetcher, parser, and summary module
- User configuration via `config.json`
- Claude Code skill integration (`.claude/commands/` markdown file invoking the TypeScript process)
- Error handling with core/ancillary distinction
- Artifact generation on every run
- Error logging to `logs/errors.log` for ancillary failures

**Out of Scope:**
- Nothing explicitly excluded by user; full initial build desired
- Future module ideas (calendar, tasks, Hacker News, GitHub notifications) noted in roadmap but not part of this spec

### Technical Considerations
- Language: TypeScript, Runtime: Node.js, Package Manager: npm
- Linting/Formatting: Biome.js
- Testing: Vitest
- HTTP: Native `fetch` (Node.js 18+)
- HTML Parsing: Cheerio
- Weather API: Open-Meteo (no API key required) or wttr.in
- Config: JSON file at project root
- Claude Code integration: markdown skill file under `.claude/commands/` that invokes the TypeScript entry point (e.g., `npx tsx src/index.ts`)
- Core modules (Greeting, Weather): surface error message and stack trace on failure
- Ancillary modules (Morning Brew): log errors to `logs/errors.log`, do not disrupt briefing
- Artifact output: `artifacts/YYYY-MM-DD-HH-MM-SS.md`
