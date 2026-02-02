import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "./config.js";

vi.mock("node:fs");

const fullConfig = {
	name: "Alice",
	location: {
		latitude: 40.7128,
		longitude: -74.006,
		label: "New York, NY",
	},
	temperatureUnit: "celsius" as const,
	modules: [
		{ id: "greeting", enabled: true, type: "core" as const },
		{ id: "weather", enabled: false, type: "core" as const },
		{ id: "stocks", enabled: true, type: "ancillary" as const },
		{ id: "news", enabled: true, type: "ancillary" as const },
	],
	stocks: [{ symbol: "AAPL", name: "Apple", type: "stock" as const }],
};

const defaults = {
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
	stocks: [
		{ symbol: "TSLA", name: "Tesla", type: "stock" },
		{ symbol: "MSTR", name: "MicroStrategy", type: "stock" },
		{ symbol: "BTC", name: "Bitcoin", type: "crypto" },
		{ symbol: "ETH", name: "Ethereum", type: "crypto" },
	],
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("config loader", () => {
	it("returns full config when config.json exists and is complete", () => {
		vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fullConfig));

		const config = loadConfig();

		expect(config.name).toBe("Alice");
		expect(config.location.label).toBe("New York, NY");
		expect(config.location.latitude).toBe(40.7128);
		expect(config.location.longitude).toBe(-74.006);
		expect(config.temperatureUnit).toBe("celsius");
		expect(config.modules).toEqual(fullConfig.modules);
		expect(config.stocks).toEqual(fullConfig.stocks);
	});

	it("returns all defaults when config.json is absent", () => {
		vi.mocked(fs.readFileSync).mockImplementation(() => {
			throw new Error("ENOENT: no such file or directory");
		});

		const config = loadConfig();

		expect(config).toEqual(defaults);
	});

	it("merges partial config with defaults", () => {
		const partialConfig = { name: "Bob" };
		vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(partialConfig));

		const config = loadConfig();

		expect(config.name).toBe("Bob");
		expect(config.location).toEqual(defaults.location);
		expect(config.temperatureUnit).toBe("fahrenheit");
		expect(config.modules).toEqual(defaults.modules);
		expect(config.stocks).toEqual(defaults.stocks);
	});

	it("returns defaults when config.json contains invalid JSON", () => {
		vi.mocked(fs.readFileSync).mockReturnValue("{ not valid json !!!");

		const config = loadConfig();

		expect(config).toEqual(defaults);
	});
});
