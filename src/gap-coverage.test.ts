import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveArtifact } from "./artifact.js";
import { logError } from "./logger.js";
import type { AppConfig } from "./types.js";

vi.mock("node:fs");

const baseConfig: AppConfig = {
	name: "Name",
	location: {
		latitude: 33.97943274232051,
		longitude: -118.46624346434118,
		label: "Venice Beach, CA",
	},
	temperatureUnit: "fahrenheit",
	modules: [
		{ id: "greeting", enabled: true, type: "core" },
		{ id: "weather", enabled: true, type: "core" },
		{ id: "stocks", enabled: true, type: "ancillary" },
		{ id: "news", enabled: true, type: "ancillary" },
	],
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("weather module: handles network fetch failure gracefully", () => {
	it("throws an error when fetch returns a non-ok response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			}),
		);

		const { weatherModule } = await import("./modules/weather.js");

		await expect(weatherModule(baseConfig)).rejects.toThrow(
			"Open-Meteo API request failed with status 500",
		);

		vi.unstubAllGlobals();
	});
});

describe("stocks module: handles missing API key", () => {
	it("throws an error when FINNHUB_API_KEY is not set", async () => {
		const originalKey = process.env.FINNHUB_API_KEY;
		delete process.env.FINNHUB_API_KEY;

		const { stocksModule } = await import("./modules/stocks.js");

		await expect(stocksModule(baseConfig)).rejects.toThrow(
			"FINNHUB_API_KEY environment variable is not set",
		);

		if (originalKey) {
			process.env.FINNHUB_API_KEY = originalKey;
		}
	});
});

describe("artifact: filename timestamp uses local time, not UTC", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("generates filename from local time (getHours) rather than UTC (getUTCHours)", () => {
		// Set a time where local and UTC hours would differ for most timezones.
		// We verify by checking the filename matches local-time components.
		const localDate = new Date(2026, 5, 15, 22, 30, 45); // June 15, 2026 at 10:30:45 PM local
		vi.setSystemTime(localDate);

		const filePath = saveArtifact('{ "test": true }');

		// The filename should use local hour (22), not UTC hour
		expect(filePath).toContain("2026-06-15-22-30-45.json");
	});
});

describe("logger: error log entry format includes all required fields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("writes a log entry with ISO timestamp, module ID, error message, and stack trace", () => {
		const testError = new Error("Something went wrong");
		testError.stack = "Error: Something went wrong\n    at someFunction (file.ts:10:5)";

		logError("weather", testError);

		// Verify mkdirSync was called to create logs directory
		expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("logs"), {
			recursive: true,
		});

		// Get the actual log entry that was written
		const appendCall = vi.mocked(fs.appendFileSync).mock.calls[0];
		const logPath = appendCall[0] as string;
		const logEntry = appendCall[1] as string;

		// Verify log file path ends with errors.log
		expect(logPath).toContain("errors.log");

		// Verify ISO timestamp format in brackets: [YYYY-MM-DDTHH:MM:SS.sssZ]
		expect(logEntry).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

		// Verify module ID in brackets
		expect(logEntry).toContain("[weather]");

		// Verify error message
		expect(logEntry).toContain("Error: Something went wrong");

		// Verify stack trace is included
		expect(logEntry).toContain("Stack:");
		expect(logEntry).toContain("at someFunction (file.ts:10:5)");
	});
});
