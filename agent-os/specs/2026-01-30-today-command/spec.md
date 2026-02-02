# Specification: /today Command

## Goal
Build a Claude Code `/today` slash command that delivers a personal daily briefing directly in the terminal, aggregating a time-of-day greeting, local weather, and a filtered Morning Brew newsletter summary into a single Markdown output.

## User Stories
- As Name, I want to run `/today` in Claude Code and receive a concise morning briefing so that I can start my day informed without switching to browsers, apps, or email.
- As Name, I want each briefing saved as an artifact file so that I can reference past briefings later.

## Specific Requirements

**Module runner architecture**
- A single orchestrator file (`src/index.ts`) imports and executes each module in sequence -- no dynamic discovery or self-registration pattern
- Each module is a separate file under `src/modules/` that exports a function matching a shared `Module` TypeScript interface
- The runner reads `config.json` to determine module order and which modules are enabled
- Each module returns a structured data object (not Markdown); a separate formatting step converts all module outputs into the final Markdown string
- The runner collects all module results, passes them to the formatter, then writes the Markdown to stdout and saves the artifact

**Greeting module**
- Determines time-of-day period: "morning" (before 12:00), "afternoon" (12:00-16:59), "evening" (17:00+)
- Produces a greeting in the format: "Good morning, Name! Today is Thursday, January 30, 2026."
- The user's name comes from `config.json` with a default of "Name"
- Returns a structured object with `greeting` (string) and `date` (string) fields

**Weather module**
- Fetches current conditions and daily forecast from the Open-Meteo API (no API key required)
- Default location is Venice Beach, CA; configurable in `config.json`
- Displays current temperature, condition description, and daily high/low
- Temperature unit defaults to Fahrenheit; configurable in `config.json` as `"fahrenheit"` or `"celsius"`
- Returns a structured object with fields: `currentTemp`, `condition`, `high`, `low`, `unit`
- Uses Open-Meteo WMO weather code mapping to convert numeric codes into human-readable condition strings (e.g., code 0 = "Clear sky", code 61 = "Slight rain")

**Morning Brew module**
- Fetches the latest issue HTML from `https://www.morningbrew.com/daily/issues/latest`
- Parses the HTML using Cheerio to extract three sections: Markets, Top News, and Market News
- Markets section produces a structured array of objects with fields `type` (e.g., "Nasdaq", "S&P", "Dow", "10-Year", "Bitcoin"), `value` (string), and `percentageChange` (string)
- Top News and Market News sections each produce an array of objects with `headline` (string) and `summary` (short paragraph string)
- Strips all ads, quizzes, recommendations, games, and promotional content during parsing
- Since Morning Brew's HTML structure may change, the parser should be written defensively with clear selector logic that is easy to update

**Markdown formatter**
- A dedicated formatter module (`src/formatter.ts`) receives the array of structured module outputs and converts them into a single Markdown string
- The greeting renders as a level-1 heading
- Weather renders as a level-2 "Weather" section with current conditions and high/low on separate lines
- Markets render as a level-2 "Markets" section containing a Markdown table with columns: Type, Value, Change
- Top News renders as a level-2 "Top News" section with each story as a bold headline followed by its summary paragraph
- Market News renders as a level-2 "Market News" section following the same headline/summary pattern
- Each module's section is separated by a horizontal rule (`---`)

**Artifact system**
- Every run saves the final Markdown output to the `artifacts/` directory at the project root
- Filename format: `YYYY-MM-DD-HH-MM-SS.md` using local time at the moment of execution
- The `artifacts/` directory is created automatically if it does not exist
- Artifacts are never overwritten; each run produces a new file

**Error handling**
- Modules are classified as either "core" or "ancillary" (set in `config.json` per module, with defaults: greeting=core, weather=core, morning-brew=ancillary)
- When a core module fails, its section in the output displays the error message and stack trace so the user can debug immediately
- When an ancillary module fails, the error is logged to `logs/errors.log` with a timestamp, module name, error message, and stack trace; the module's section is silently omitted from the briefing
- The `logs/` directory is created automatically if it does not exist
- The briefing always completes and produces output regardless of individual module failures

**Configuration**
- Stored in `config.json` at the project root
- Fields: `name` (string, default "Name"), `location` (object with `latitude`, `longitude`, `label`, defaults to Venice Beach, CA), `temperatureUnit` ("fahrenheit" | "celsius", default "fahrenheit"), `modules` (ordered array of objects each with `id`, `enabled`, and `type` of "core" or "ancillary")
- The command works with sensible defaults when `config.json` is absent or partially filled; missing fields fall back to defaults
- Config is loaded once at startup by the runner and passed to each module that needs it

**Claude Code integration**
- A Markdown file at `.claude/commands/today.md` defines the `/today` slash command
- The command file instructs Claude Code to run `npx tsx src/index.ts` from the project root and present the stdout output to the user
- The command file should include a brief description so Claude Code can display it in the command list

**Project initialization and tooling**
- Initialize with `npm init` and install dev dependencies: `typescript`, `tsx`, `@biomejs/biome`, `vitest`, `cheerio`
- `tsconfig.json` targeting ES2022 with Node module resolution, strict mode enabled
- Biome.js configured via `biome.json` for both linting and formatting
- Vitest configured in `vitest.config.ts`
- npm scripts: `start` (runs `npx tsx src/index.ts`), `lint` (biome check), `format` (biome format --write), `test` (vitest run)

## Visual Design
No visual assets provided.

## Existing Code to Leverage

**Agent-OS error handling standard (`agent-os/standards/global/error-handling.md`)**
- Defines graceful degradation as the pattern for non-critical service failures, which directly maps to the ancillary module error-handling strategy
- Recommends centralized error handling at boundaries rather than scattering try-catch, which should inform the runner's module execution wrapper

**Agent-OS coding style standard (`agent-os/standards/global/coding-style.md`)**
- Enforces small, focused functions and DRY principles; each module file should have a single exported entry function with helpers kept small
- Naming conventions should be consistent across all module files and the runner

**Agent-OS test-writing standard (`agent-os/standards/testing/test-writing.md`)**
- Tests should focus on core user flows: runner executing modules in order, greeting format correctness, weather data parsing, Morning Brew HTML extraction
- External API calls (Open-Meteo, Morning Brew HTML fetch) must be mocked in tests
- Edge case tests should be deferred; focus on the happy path for each module

**Claude Code commands directory pattern (`.claude/commands/agent-os/`)**
- Existing command files in this directory demonstrate the Markdown-file convention for defining Claude Code slash commands
- The `/today` command file should follow the same structure but live at `.claude/commands/today.md` (top level, not nested under agent-os)

## Out of Scope
- Calendar, tasks, Hacker News, GitHub notifications, or any modules beyond greeting, weather, and Morning Brew
- Interactive configuration (CLI prompts or a settings UI); config is edited manually in `config.json`
- Caching or rate-limiting for API requests
- Scheduled or automatic execution (cron, background daemon); the command runs only when invoked manually
- Authentication or multi-user support; this is a single-user tool for Name
- Deployment, CI/CD, or hosting infrastructure
- Browser-based or GUI rendering of the briefing output
- Summarization or rewriting of Morning Brew content via an LLM; parsing extracts existing text only
- Push notifications or alerts when new Morning Brew issues are published
- Backward compatibility with older Node.js versions; Node.js 18+ is required
