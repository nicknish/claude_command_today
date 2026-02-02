# Task Breakdown: /today Command

## Overview
Total Tasks: 48

This is a greenfield TypeScript CLI project that delivers a personal daily briefing via a Claude Code `/today` slash command. The architecture follows a module runner pattern where each module (greeting, weather, Morning Brew) returns structured data, a formatter converts it to Markdown, and the runner orchestrates execution, artifact saving, and error handling.

## Task List

### Project Foundation

#### Task Group 1: Project Initialization and Tooling
**Dependencies:** None

- [x] 1.0 Complete project initialization and tooling setup
  - [x] 1.1 Initialize the npm project
    - Run `npm init -y` at the project root
    - Set `"type": "module"` in `package.json`
    - Set `"name": "claude-command-today"`
    - Set `"scripts"` to include:
      - `"start": "npx tsx src/index.ts"`
      - `"lint": "npx biome check ."`
      - `"format": "npx biome format --write ."`
      - `"test": "vitest run"`
  - [x] 1.2 Install dev dependencies
    - Install: `typescript`, `tsx`, `@biomejs/biome`, `vitest`, `cheerio`
    - All as devDependencies (`npm install -D`)
  - [x] 1.3 Create `tsconfig.json`
    - Target: `ES2022`
    - Module: `Node16` (or `NodeNext`) for Node module resolution
    - `strict: true`
    - `outDir: "./dist"`
    - `rootDir: "./src"`
    - `esModuleInterop: true`
    - `resolveJsonModule: true`
    - Include: `["src/**/*"]`
  - [x] 1.4 Create `biome.json`
    - Enable linting and formatting
    - Set indent style to tabs or spaces (match team preference)
    - Configure recommended rules
  - [x] 1.5 Create `vitest.config.ts`
    - Configure Vitest with TypeScript support
    - Set test file glob pattern (e.g., `src/**/*.test.ts`)
  - [x] 1.6 Create the source directory structure
    - Create `src/` directory
    - Create `src/modules/` directory
    - Create empty `src/index.ts` entry point (placeholder with a console.log so `npm start` can verify the toolchain works)
  - [x] 1.7 Verify toolchain works end-to-end
    - Run `npm start` and confirm it executes `src/index.ts` via tsx
    - Run `npm run lint` and confirm Biome runs without config errors
    - Run `npm run format` and confirm Biome formats without errors
    - Run `npm test` and confirm Vitest runs (0 tests is fine at this stage)

**Acceptance Criteria:**
- `npm start` executes `src/index.ts` via tsx and prints output
- `npm run lint` runs Biome check without configuration errors
- `npm run format` runs Biome format without configuration errors
- `npm test` runs Vitest without configuration errors
- `tsconfig.json` has `strict: true` and targets ES2022
- All dependencies installed and present in `package.json` devDependencies

---

### Core Infrastructure

#### Task Group 2: TypeScript Types, Config Loader, and Shared Utilities
**Dependencies:** Task Group 1

- [x] 2.0 Complete types, config, and shared utilities
  - [x] 2.1 Write 4 focused tests for config loading
    - Test 1: Config loader returns full config when `config.json` exists and is complete
    - Test 2: Config loader returns all defaults when `config.json` is absent (mock `fs` to simulate missing file)
    - Test 3: Config loader merges partial config with defaults (e.g., config has `name` but no `location`)
    - Test 4: Config loader returns defaults when `config.json` contains invalid JSON (mock `fs`)
  - [x] 2.2 Define the `Module` interface and shared types in `src/types.ts`
    - `ModuleResult` type: `{ id: string; success: boolean; data?: unknown; error?: Error }`
    - `ModuleFn` type: a function signature `(config: AppConfig) => Promise<ModuleResult>`
    - `ModuleEntry` type: `{ id: string; enabled: boolean; type: "core" | "ancillary" }`
    - `AppConfig` type: `{ name: string; location: { latitude: number; longitude: number; label: string }; temperatureUnit: "fahrenheit" | "celsius"; modules: ModuleEntry[] }`
    - `GreetingData` type: `{ greeting: string; date: string }`
    - `WeatherData` type: `{ currentTemp: number; condition: string; high: number; low: number; unit: string }`
    - `MarketItem` type: `{ type: string; value: string; percentageChange: string }`
    - `NewsItem` type: `{ headline: string; summary: string }`
    - `MorningBrewData` type: `{ markets: MarketItem[]; topNews: NewsItem[]; marketNews: NewsItem[] }`
  - [x] 2.3 Implement config loader in `src/config.ts`
    - Read `config.json` from the project root using `fs.readFileSync`
    - Define hardcoded defaults: `name: "Name"`, `location: { latitude: 33.97943274232051, longitude: -118.46624346434118, label: "Venice Beach, CA" }`, `temperatureUnit: "fahrenheit"`, `modules: [{ id: "greeting", enabled: true, type: "core" }, { id: "weather", enabled: true, type: "core" }, { id: "morning-brew", enabled: true, type: "ancillary" }]`
    - Deep-merge loaded config with defaults so any missing field falls back to the default
    - If file is missing or JSON is invalid, return the full defaults object without throwing
    - Export a `loadConfig(): AppConfig` function
  - [x] 2.4 Create a default `config.json` at the project root
    - Include all fields with the default values from the spec
    - This file serves as documentation and a starting point for customization
  - [x] 2.5 Ensure config loader tests pass
    - Run ONLY the 4 tests written in 2.1
    - Verify all pass

**Acceptance Criteria:**
- All 4 config loader tests pass
- `src/types.ts` exports all shared types and interfaces
- `loadConfig()` returns a complete `AppConfig` object in all scenarios (full config, missing file, partial config, invalid JSON)
- Default `config.json` exists at the project root with sensible values

---

#### Task Group 3: Module Runner and Error Handling
**Dependencies:** Task Group 2

- [x] 3.0 Complete module runner with error handling
  - [x] 3.1 Write 5 focused tests for the module runner
    - Test 1: Runner executes all enabled modules in config-defined order and returns their results
    - Test 2: Runner skips disabled modules (module with `enabled: false` is not called)
    - Test 3: When a core module throws, its result contains `success: false` and the error object
    - Test 4: When an ancillary module throws, its result contains `success: false`, the error is logged to `logs/errors.log`, and the runner continues
    - Test 5: Runner passes the loaded config to each module function
    - Mock all module functions (do not call real greeting/weather/brew modules)
    - Mock `fs` for error log writing
  - [x] 3.2 Implement the module runner in `src/runner.ts`
    - Export an `async runModules(config: AppConfig): Promise<ModuleResult[]>` function
    - Build a map of module ID to module function: `{ "greeting": greetingModule, "weather": weatherModule, "morning-brew": morningBrewModule }`
    - Iterate over `config.modules` in order; skip entries where `enabled` is `false`
    - For each enabled module, call its function inside a try/catch
    - On success, push `{ id, success: true, data }` to results
    - On failure for a core module, push `{ id, success: false, error }` to results (error will be shown to user by formatter)
    - On failure for an ancillary module, push `{ id, success: false }` to results (no error in result), and write the error details to `logs/errors.log`
  - [x] 3.3 Implement the error logger utility in `src/logger.ts`
    - Export `logError(moduleId: string, error: Error): void`
    - Create `logs/` directory if it does not exist (use `fs.mkdirSync` with `{ recursive: true }`)
    - Append a timestamped entry to `logs/errors.log` with format: `[ISO timestamp] [module-id] Error: message\nStack: stack\n\n`
  - [x] 3.4 Ensure module runner tests pass
    - Run ONLY the 5 tests written in 3.1
    - Verify all pass

**Acceptance Criteria:**
- All 5 module runner tests pass
- Runner executes modules in config-defined order
- Disabled modules are skipped
- Core module errors are preserved in results for display
- Ancillary module errors are logged to `logs/errors.log` and omitted from results
- `logs/` directory is auto-created

---

### Module Implementation

#### Task Group 4: Greeting Module
**Dependencies:** Task Group 2

- [x] 4.0 Complete the greeting module
  - [x] 4.1 Write 3 focused tests for the greeting module
    - Test 1: Returns greeting with "Good morning" when hour is before 12, includes user name from config, and includes correctly formatted date string
    - Test 2: Returns greeting with "Good afternoon" when hour is between 12 and 16
    - Test 3: Returns greeting with "Good evening" when hour is 17 or later
    - Mock `Date` to control the current time in each test
  - [x] 4.2 Implement the greeting module in `src/modules/greeting.ts`
    - Export a function matching the `ModuleFn` signature
    - Determine time-of-day period from current local hour: "morning" (0-11), "afternoon" (12-16), "evening" (17-23)
    - Format greeting string: `"Good {period}, {name}! Today is {DayOfWeek}, {Month} {Day}, {Year}."`
    - Use `Intl.DateTimeFormat` or `Date` methods for day-of-week and month names
    - Return `ModuleResult` with `id: "greeting"`, `success: true`, `data: { greeting, date }` where `date` is the ISO date string
  - [x] 4.3 Ensure greeting module tests pass
    - Run ONLY the 3 tests written in 4.1
    - Verify all pass

**Acceptance Criteria:**
- All 3 greeting module tests pass
- Greeting uses the correct time-of-day period based on current hour
- User name is read from config
- Date is formatted as "DayOfWeek, Month Day, Year" (e.g., "Thursday, January 30, 2026")

---

#### Task Group 5: Weather Module
**Dependencies:** Task Group 2 (completed)

- [x] 5.0 Complete the weather module
  - [x] 5.1 Write 3 focused tests for the weather module
    - Test 1: Parses a successful Open-Meteo API response and returns correct `WeatherData` fields (currentTemp, condition, high, low, unit) in Fahrenheit
    - Test 2: Correctly maps a WMO weather code to a human-readable condition string (e.g., code 0 returns "Clear sky", code 61 returns "Slight rain")
    - Test 3: Uses Celsius unit when config specifies `"celsius"` and passes correct query params to API
    - Mock `fetch` globally in all tests to return a canned Open-Meteo JSON response
  - [x] 5.2 Create the WMO weather code map in `src/modules/weather-codes.ts`
    - Export a `Record<number, string>` mapping WMO codes to descriptions
    - Include at minimum: 0 (Clear sky), 1 (Mainly clear), 2 (Partly cloudy), 3 (Overcast), 45 (Foggy), 48 (Depositing rime fog), 51 (Light drizzle), 53 (Moderate drizzle), 55 (Dense drizzle), 61 (Slight rain), 63 (Moderate rain), 65 (Heavy rain), 71 (Slight snow), 73 (Moderate snow), 75 (Heavy snow), 80 (Slight rain showers), 81 (Moderate rain showers), 82 (Violent rain showers), 95 (Thunderstorm), 96 (Thunderstorm with slight hail), 99 (Thunderstorm with heavy hail)
    - Default fallback: "Unknown" for unmapped codes
  - [x] 5.3 Implement the weather module in `src/modules/weather.ts`
    - Export a function matching the `ModuleFn` signature
    - Build the Open-Meteo API URL using config location coordinates
    - Request params: `current_weather=true`, `daily=temperature_2m_max,temperature_2m_min`, `temperature_unit=fahrenheit` (or `celsius` from config), `timezone=auto`, `forecast_days=1`
    - Use native `fetch` (Node.js 18+)
    - Parse response JSON: extract `current_weather.temperature`, `current_weather.weathercode`, `daily.temperature_2m_max[0]`, `daily.temperature_2m_min[0]`
    - Map weather code to condition string using the weather codes map
    - Return `ModuleResult` with `data` as `WeatherData`
  - [x] 5.4 Ensure weather module tests pass
    - Run ONLY the 3 tests written in 5.1
    - Verify all pass

**Acceptance Criteria:**
- All 3 weather module tests pass
- Module calls the correct Open-Meteo endpoint with location from config
- Temperature unit respects config setting
- WMO weather codes are mapped to human-readable strings
- Returns structured `WeatherData` object

---

#### Task Group 6: Morning Brew Module
**Dependencies:** Task Group 2 (completed)

- [x] 6.0 Complete the Morning Brew module
  - [x] 6.1 Write 4 focused tests for the Morning Brew parser
    - Test 1: Parses a representative HTML snippet and extracts the Markets array with correct `type`, `value`, and `percentageChange` fields
    - Test 2: Parses a representative HTML snippet and extracts Top News items with `headline` and `summary` fields
    - Test 3: Parses a representative HTML snippet and extracts Market News items with `headline` and `summary` fields
    - Test 4: Strips ads, quizzes, recommendations, and game content (returns no items for those sections)
    - Use saved HTML fixture snippets (store in `src/modules/__fixtures__/morning-brew-sample.html`) rather than mocking fetch for parser tests
    - Mock `fetch` to return the fixture HTML when testing the full module function
  - [x] 6.2 Create the HTML fixture file `src/modules/__fixtures__/morning-brew-sample.html`
    - Fetch the current Morning Brew latest issue page and save a trimmed HTML sample
    - Include representative markup for: Markets section, Top News section, Market News section, and at least one ad/quiz/games section to verify stripping
    - Keep the fixture small -- only the structural elements needed for selector testing
  - [x] 6.3 Implement the Morning Brew parser in `src/modules/morning-brew-parser.ts`
    - Export `parseMorningBrew(html: string): MorningBrewData`
    - Use Cheerio to load the HTML
    - Extract Markets section: find market items and build `MarketItem[]` with `type`, `value`, `percentageChange`
    - Extract Top News section: find story blocks and build `NewsItem[]` with `headline`, `summary`
    - Extract Market News section: same pattern as Top News
    - Strip all elements matching ad, quiz, recommendation, and game selectors
    - Write selectors defensively with clear comments explaining what each targets, so they are easy to update if Morning Brew changes their HTML structure
    - Return `MorningBrewData` object
  - [x] 6.4 Implement the Morning Brew module in `src/modules/morning-brew.ts`
    - Export a function matching the `ModuleFn` signature
    - Fetch HTML from `https://www.morningbrew.com/daily/issues/latest` using native `fetch`
    - Pass fetched HTML to `parseMorningBrew()`
    - Return `ModuleResult` with `data` as `MorningBrewData`
  - [x] 6.5 Ensure Morning Brew module tests pass
    - Run ONLY the 4 tests written in 6.1
    - Verify all pass

**Acceptance Criteria:**
- All 4 Morning Brew module tests pass
- Parser extracts Markets as an array of `{ type, value, percentageChange }` objects
- Parser extracts Top News and Market News as arrays of `{ headline, summary }` objects
- Ads, quizzes, recommendations, and games are stripped from output
- Selectors are clearly commented for future maintenance

---

### Output Layer

#### Task Group 7: Markdown Formatter
**Dependencies:** Task Groups 2, 4, 5, 6 (needs type definitions and knowledge of each module's data shape)

- [x] 7.0 Complete the Markdown formatter
  - [x] 7.1 Write 5 focused tests for the Markdown formatter
    - Test 1: Formats greeting data as a level-1 heading (e.g., `# Good morning, Name! Today is Thursday, January 30, 2026.`)
    - Test 2: Formats weather data as a level-2 "Weather" section with current conditions and high/low on separate lines
    - Test 3: Formats markets data as a level-2 "Markets" section containing a Markdown table with columns Type, Value, Change
    - Test 4: Formats Top News and Market News as level-2 sections with bold headlines and summary paragraphs
    - Test 5: When a core module has failed, its section shows the error message and stack trace instead of data; when an ancillary module has failed, its section is omitted entirely
    - Use hardcoded `ModuleResult` objects as test inputs (no module execution needed)
  - [x] 7.2 Implement the formatter in `src/formatter.ts`
    - Export `formatBriefing(results: ModuleResult[], config: AppConfig): string`
    - Process results in order; for each result, call the appropriate section formatter based on `result.id`
    - Greeting section: render `data.greeting` as `# {greeting}`
    - Weather section: render as `## Weather\n\nCurrently: {currentTemp} F, {condition}\nHigh: {high} F | Low: {low} F` (use unit from data)
    - Markets section: render as `## Markets\n\n| Type | Value | Change |\n|------|-------|--------|\n| {row} |...` for each market item
    - Top News section: render as `## Top News\n\n**{headline}**\n\n{summary}\n\n` for each item
    - Market News section: render as `## Market News\n\n**{headline}**\n\n{summary}\n\n` for each item
    - For a failed core module: render `## {Module Name}\n\nError: {message}\n\n\`\`\`\n{stack}\n\`\`\``
    - For a failed ancillary module: skip the section entirely (no output)
    - Separate each module section with `---`
  - [x] 7.3 Ensure formatter tests pass
    - Run ONLY the 5 tests written in 7.1
    - Verify all pass

**Acceptance Criteria:**
- All 5 formatter tests pass
- Greeting renders as level-1 heading
- Weather renders as level-2 section with current conditions and high/low
- Markets render as a Markdown table with Type, Value, Change columns
- Top News and Market News render with bold headlines and summary paragraphs
- Sections are separated by horizontal rules
- Failed core modules show error + stack trace
- Failed ancillary modules are silently omitted

---

#### Task Group 8: Artifact System
**Dependencies:** Task Group 2 (completed)

- [x] 8.0 Complete the artifact system
  - [x] 8.1 Write 3 focused tests for the artifact system
    - Test 1: Saves Markdown content to `artifacts/YYYY-MM-DD-HH-MM-SS.md` using local time
    - Test 2: Creates the `artifacts/` directory if it does not exist
    - Test 3: Does not overwrite existing files (two saves one second apart produce two distinct files)
    - Mock `fs` and `Date` to control file system and timestamps
  - [x] 8.2 Implement the artifact saver in `src/artifact.ts`
    - Export `saveArtifact(markdown: string): string` (returns the file path of the saved artifact)
    - Generate filename from current local time: `YYYY-MM-DD-HH-MM-SS.md`
    - Create `artifacts/` directory at project root if it does not exist (`fs.mkdirSync` with `{ recursive: true }`)
    - Write the full Markdown string to the file using `fs.writeFileSync`
    - Return the absolute path of the saved file
  - [x] 8.3 Ensure artifact system tests pass
    - Run ONLY the 3 tests written in 8.1
    - Verify all pass

**Acceptance Criteria:**
- All 3 artifact system tests pass
- Artifacts are saved with the correct filename format
- `artifacts/` directory is auto-created
- Each run produces a unique file

---

### Integration Layer

#### Task Group 9: Main Entry Point (Orchestrator Wiring)
**Dependencies:** Task Groups 3, 4, 5, 6, 7, 8

- [x] 9.0 Complete the main entry point wiring
  - [x] 9.1 Write 2 focused integration tests for the main entry point
    - Test 1: `main()` calls config loader, runner, formatter, artifact saver, and writes formatted Markdown to stdout (mock all dependencies)
    - Test 2: `main()` completes without throwing even when modules fail (mock a core module failure and an ancillary module failure)
  - [x] 9.2 Implement the main entry point in `src/index.ts`
    - Import `loadConfig` from `src/config.ts`
    - Import `runModules` from `src/runner.ts`
    - Import `formatBriefing` from `src/formatter.ts`
    - Import `saveArtifact` from `src/artifact.ts`
    - Define `async function main()`:
      1. `const config = loadConfig()`
      2. `const results = await runModules(config)`
      3. `const markdown = formatBriefing(results, config)`
      4. `saveArtifact(markdown)`
      5. `process.stdout.write(markdown)`
    - Call `main()` at module level and handle top-level rejection with `console.error` + `process.exit(1)`
  - [x] 9.3 Ensure integration tests pass
    - Run ONLY the 2 tests written in 9.1
    - Verify all pass

**Acceptance Criteria:**
- All 2 integration tests pass
- Running `npm start` executes the full pipeline: load config, run modules, format output, save artifact, print to stdout
- Process exits cleanly on success
- Process does not crash on individual module failures

---

#### Task Group 10: Claude Code Command File
**Dependencies:** Task Group 9

- [x] 10.0 Complete the Claude Code `/today` command integration
  - [x] 10.1 Create the `.claude/commands/today.md` command file
    - Create `.claude/commands/` directory if it does not exist
    - Write the command file with:
      - A brief description of the command (e.g., "Run a personal daily briefing with greeting, weather, and Morning Brew summary")
      - Instructions for Claude Code to execute `npx tsx src/index.ts` from the project root
      - Instructions to display the stdout output directly to the user
    - Follow the existing command file pattern from `.claude/commands/agent-os/`
  - [x] 10.2 Verify the command file is recognized
    - Cannot programmatically verify Claude Code recognition, so just confirm the file exists and follows the correct format

**Acceptance Criteria:**
- `.claude/commands/today.md` exists and follows the expected Markdown format
- `/today` command appears in Claude Code's command list
- Running `/today` executes the TypeScript entry point and displays the briefing

---

### Testing and Quality

#### Task Group 11: Test Review, Gap Analysis, and Final Validation
**Dependencies:** Task Groups 1-10

- [ ] 11.0 Review existing tests and fill critical gaps only
  - [ ] 11.1 Review tests from Task Groups 2-9
    - Review the 4 config tests (Task 2.1)
    - Review the 5 runner tests (Task 3.1)
    - Review the 3 greeting tests (Task 4.1)
    - Review the 3 weather tests (Task 5.1)
    - Review the 4 Morning Brew tests (Task 6.1)
    - Review the 5 formatter tests (Task 7.1)
    - Review the 3 artifact tests (Task 8.1)
    - Review the 2 integration tests (Task 9.1)
    - Total existing tests: 29 tests
  - [ ] 11.2 Analyze test coverage gaps for the /today feature
    - Identify critical end-to-end workflows that lack coverage
    - Focus ONLY on gaps related to this feature's requirements
    - Do NOT assess entire application test coverage
    - Prioritize integration points between modules, formatter, and artifact system
  - [ ] 11.3 Write up to 10 additional strategic tests maximum
    - Suggested gap areas to consider (write tests ONLY if gaps are found):
      - End-to-end: full pipeline with all modules mocked returns valid Markdown with all sections
      - End-to-end: full pipeline with a module disabled in config omits that section
      - Formatter: horizontal rules (`---`) correctly separate sections
      - Config: modules array order in config is respected through to final output
      - Weather module: handles network fetch failure gracefully (throws, caught by runner)
      - Morning Brew module: handles network fetch failure gracefully (throws, caught by runner)
      - Artifact: filename timestamp uses local time, not UTC
      - Logger: error log entry format includes timestamp, module ID, message, and stack
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases, performance tests, and accessibility tests
  - [ ] 11.4 Run all feature-specific tests
    - Run `npm test` to execute all tests in the project
    - Expected total: approximately 29-39 tests maximum
    - Verify all tests pass
  - [ ] 11.5 Run linting and formatting checks
    - Run `npm run lint` and fix any issues
    - Run `npm run format` to ensure consistent formatting
    - Verify no linting errors remain

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 29-39 tests total)
- Critical user workflows for this feature are covered
- No more than 10 additional tests added when filling in testing gaps
- Biome linting passes with no errors
- Biome formatting is consistent across all source files

---

## Execution Order

Recommended implementation sequence with parallelization notes:

```
1. Task Group 1: Project Initialization and Tooling
   |
   v
2. Task Group 2: Types, Config Loader, and Shared Utilities
   |
   +---> 3. Task Group 3: Module Runner and Error Handling
   |
   +---> 4. Task Group 4: Greeting Module          (parallel with 5, 6, 8)
   +---> 5. Task Group 5: Weather Module            (parallel with 4, 6, 8)
   +---> 6. Task Group 6: Morning Brew Module       (parallel with 4, 5, 8)
   +---> 8. Task Group 8: Artifact System           (parallel with 4, 5, 6)
   |
   v
7. Task Group 7: Markdown Formatter  (needs type awareness from 4, 5, 6)
   |
   v
9. Task Group 9: Main Entry Point    (wires together 3, 7, 8)
   |
   v
10. Task Group 10: Claude Code Command File
   |
   v
11. Task Group 11: Test Review, Gap Analysis, and Final Validation
```

**Key dependency notes:**
- Task Groups 4, 5, 6, and 8 can all be built in parallel after Task Group 2 is complete, since they only depend on shared types and config.
- Task Group 3 (runner) can also be built in parallel with the modules, since it mocks module functions in its tests.
- Task Group 7 (formatter) should be built after modules, because it needs to understand the concrete data shapes each module produces.
- Task Group 9 is the final wiring step that connects all pieces.
- Task Group 10 is a small standalone file creation that only needs to know the entry point command.
- Task Group 11 is the final quality gate.
