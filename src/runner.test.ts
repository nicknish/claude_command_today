import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "./types.js";

vi.mock("node:fs");

vi.mock("./modules/greeting.js", () => ({
	greetingModule: vi.fn(),
}));

vi.mock("./modules/weather.js", () => ({
	weatherModule: vi.fn(),
}));

vi.mock("./modules/stocks.js", () => ({
	stocksModule: vi.fn(),
}));

vi.mock("./modules/news.js", () => ({
	newsModule: vi.fn(),
}));

import { greetingModule } from "./modules/greeting.js";
import { newsModule } from "./modules/news.js";
import { stocksModule } from "./modules/stocks.js";
import { weatherModule } from "./modules/weather.js";
import { runModules } from "./runner.js";

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

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("module runner", () => {
	it("executes all enabled modules in config-defined order and returns their results", async () => {
		const greetingData = { greeting: "Good morning, Name!", date: "2026-01-30" };
		const weatherData = { currentTemp: 45, condition: "Clear sky", high: 50, low: 38, unit: "F" };
		const stocksData = { quotes: [], asOf: "8:00:00 AM" };
		const newsData = { markdown: "## US News\n\nSome news" };

		vi.mocked(greetingModule).mockResolvedValue({
			id: "greeting",
			success: true,
			data: greetingData,
		});
		vi.mocked(weatherModule).mockResolvedValue({ id: "weather", success: true, data: weatherData });
		vi.mocked(stocksModule).mockResolvedValue({
			id: "stocks",
			success: true,
			data: stocksData,
		});
		vi.mocked(newsModule).mockResolvedValue({
			id: "news",
			success: true,
			data: newsData,
		});

		const results = await runModules(baseConfig);

		expect(results).toHaveLength(4);
		expect(results[0]).toEqual({ id: "greeting", success: true, data: greetingData });
		expect(results[1]).toEqual({ id: "weather", success: true, data: weatherData });
		expect(results[2]).toEqual({ id: "stocks", success: true, data: stocksData });
		expect(results[3]).toEqual({ id: "news", success: true, data: newsData });
	});

	it("skips disabled modules", async () => {
		const configWithDisabled: AppConfig = {
			...baseConfig,
			modules: [
				{ id: "greeting", enabled: true, type: "core" },
				{ id: "weather", enabled: false, type: "core" },
				{ id: "stocks", enabled: true, type: "ancillary" },
				{ id: "news", enabled: true, type: "ancillary" },
			],
		};

		const greetingData = { greeting: "Good morning, Name!", date: "2026-01-30" };
		const stocksData = { quotes: [], asOf: "8:00:00 AM" };
		const newsData = { markdown: "## US News\n\nSome news" };

		vi.mocked(greetingModule).mockResolvedValue({
			id: "greeting",
			success: true,
			data: greetingData,
		});
		vi.mocked(stocksModule).mockResolvedValue({
			id: "stocks",
			success: true,
			data: stocksData,
		});
		vi.mocked(newsModule).mockResolvedValue({
			id: "news",
			success: true,
			data: newsData,
		});

		const results = await runModules(configWithDisabled);

		expect(results).toHaveLength(3);
		expect(results[0].id).toBe("greeting");
		expect(results[1].id).toBe("stocks");
		expect(results[2].id).toBe("news");
		expect(weatherModule).not.toHaveBeenCalled();
	});

	it("preserves the error object in result when a core module throws", async () => {
		const coreError = new Error("weather API is down");

		vi.mocked(greetingModule).mockResolvedValue({ id: "greeting", success: true, data: {} });
		vi.mocked(weatherModule).mockRejectedValue(coreError);
		vi.mocked(stocksModule).mockResolvedValue({ id: "stocks", success: true, data: {} });
		vi.mocked(newsModule).mockResolvedValue({ id: "news", success: true, data: {} });

		const results = await runModules(baseConfig);

		expect(results).toHaveLength(4);

		const weatherResult = results[1];
		expect(weatherResult.id).toBe("weather");
		expect(weatherResult.success).toBe(false);
		expect(weatherResult.error).toBe(coreError);
	});

	it("logs error to file and omits error from result when an ancillary module throws", async () => {
		const ancillaryError = new Error("stocks fetch failed");

		vi.mocked(greetingModule).mockResolvedValue({ id: "greeting", success: true, data: {} });
		vi.mocked(weatherModule).mockResolvedValue({ id: "weather", success: true, data: {} });
		vi.mocked(stocksModule).mockRejectedValue(ancillaryError);
		vi.mocked(newsModule).mockResolvedValue({ id: "news", success: true, data: {} });

		const results = await runModules(baseConfig);

		expect(results).toHaveLength(4);

		const stocksResult = results[2];
		expect(stocksResult.id).toBe("stocks");
		expect(stocksResult.success).toBe(false);
		expect(stocksResult.error).toBeUndefined();

		expect(fs.mkdirSync).toHaveBeenCalled();
		expect(fs.appendFileSync).toHaveBeenCalledWith(
			expect.stringContaining("errors.log"),
			expect.stringContaining("stocks"),
			"utf-8",
		);
	});

	it("passes the loaded config to each module function", async () => {
		vi.mocked(greetingModule).mockResolvedValue({ id: "greeting", success: true, data: {} });
		vi.mocked(weatherModule).mockResolvedValue({ id: "weather", success: true, data: {} });
		vi.mocked(stocksModule).mockResolvedValue({ id: "stocks", success: true, data: {} });
		vi.mocked(newsModule).mockResolvedValue({ id: "news", success: true, data: {} });

		await runModules(baseConfig);

		expect(greetingModule).toHaveBeenCalledWith(baseConfig);
		expect(weatherModule).toHaveBeenCalledWith(baseConfig);
		expect(stocksModule).toHaveBeenCalledWith(baseConfig);
		expect(newsModule).toHaveBeenCalledWith(baseConfig);
	});
});
