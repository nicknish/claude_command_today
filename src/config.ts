import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "./types.js";

const defaults: AppConfig = {
	name: "[Name]",
	location: {
		latitude: 33.97943274232051,
		longitude: -118.46624346434118,
		label: "Venice Beach, CA",
	},
	temperatureUnit: "fahrenheit" as const,
	modules: [
		{ id: "greeting", enabled: true, type: "core" },
		{ id: "weather", enabled: true, type: "ancillary" },
		{ id: "stocks", enabled: true, type: "ancillary" },
		{ id: "crypto", enabled: true, type: "ancillary" },
		{ id: "news", enabled: true, type: "ancillary" },
		{ id: "financeNews", enabled: true, type: "ancillary" },
		{ id: "todoist", enabled: true, type: "ancillary" },
	],
	stocks: [{ symbol: "COIN", name: "Coinbase", type: "stock" }],
	crypto: [{ id: "bitcoin", symbol: "BTC" }],
};

function deepMerge(target: AppConfig, source: Record<string, unknown>): AppConfig {
	const result = { ...target };

	for (const key of Object.keys(source)) {
		const sourceValue = source[key];
		const targetValue = (target as Record<string, unknown>)[key];

		if (
			sourceValue !== null &&
			typeof sourceValue === "object" &&
			!Array.isArray(sourceValue) &&
			targetValue !== null &&
			typeof targetValue === "object" &&
			!Array.isArray(targetValue)
		) {
			(result as Record<string, unknown>)[key] = deepMerge(
				targetValue as AppConfig,
				sourceValue as Record<string, unknown>,
			);
		} else if (sourceValue !== undefined) {
			(result as Record<string, unknown>)[key] = sourceValue;
		}
	}

	return result;
}

export function loadConfig(): AppConfig {
	try {
		const configPath = path.resolve(import.meta.dirname, "..", "config.json");
		const raw = fs.readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		return deepMerge(defaults, parsed);
	} catch {
		return { ...defaults };
	}
}
