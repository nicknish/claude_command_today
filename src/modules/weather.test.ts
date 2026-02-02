import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, WeatherData } from "../types.js";
import { weatherModule } from "./weather.js";
import { getWeatherCondition } from "./weather-codes.js";

/**
 * Canned Open-Meteo API response used across all tests.
 * Represents a typical successful response with current weather and daily forecast.
 */
function createOpenMeteoResponse(overrides?: {
	temperature?: number;
	weathercode?: number;
	temperatureMax?: number;
	temperatureMin?: number;
}) {
	return {
		current_weather: {
			temperature: overrides?.temperature ?? 48.5,
			weathercode: overrides?.weathercode ?? 0,
			windspeed: 8.2,
			winddirection: 210,
			is_day: 1,
			time: "2026-01-30T10:00",
		},
		daily: {
			time: ["2026-01-30"],
			temperature_2m_max: [overrides?.temperatureMax ?? 53.1],
			temperature_2m_min: [overrides?.temperatureMin ?? 39.4],
		},
	};
}

const defaultConfig: AppConfig = {
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
		{ id: "morning-brew", enabled: true, type: "ancillary" },
	],
};

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createOpenMeteoResponse()),
		}),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("weather module", () => {
	it("parses a successful Open-Meteo API response and returns correct WeatherData fields in Fahrenheit", async () => {
		const result = await weatherModule(defaultConfig);

		expect(result.id).toBe("weather");
		expect(result.success).toBe(true);

		const data = result.data as WeatherData;
		expect(data.currentTemp).toBe(48.5);
		expect(data.condition).toBe("Clear sky");
		expect(data.high).toBe(53.1);
		expect(data.low).toBe(39.4);
		expect(data.unit).toBe("F");

		// Verify fetch was called with the correct Open-Meteo URL and Fahrenheit params
		const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
		expect(fetchCall).toContain("api.open-meteo.com");
		expect(fetchCall).toContain("latitude=45.5051");
		expect(fetchCall).toContain("longitude=-122.675");
		expect(fetchCall).toContain("temperature_unit=fahrenheit");
		expect(fetchCall).toContain("current_weather=true");
		expect(fetchCall).toContain("daily=temperature_2m_max%2Ctemperature_2m_min");
		expect(fetchCall).toContain("timezone=auto");
		expect(fetchCall).toContain("forecast_days=1");
	});

	it("correctly maps WMO weather codes to human-readable condition strings", () => {
		// Test a sample of WMO codes to confirm correct mapping
		expect(getWeatherCondition(0)).toBe("Clear sky");
		expect(getWeatherCondition(1)).toBe("Mainly clear");
		expect(getWeatherCondition(2)).toBe("Partly cloudy");
		expect(getWeatherCondition(3)).toBe("Overcast");
		expect(getWeatherCondition(45)).toBe("Foggy");
		expect(getWeatherCondition(61)).toBe("Slight rain");
		expect(getWeatherCondition(63)).toBe("Moderate rain");
		expect(getWeatherCondition(65)).toBe("Heavy rain");
		expect(getWeatherCondition(71)).toBe("Slight snow");
		expect(getWeatherCondition(95)).toBe("Thunderstorm");
		expect(getWeatherCondition(99)).toBe("Thunderstorm with heavy hail");

		// Unmapped code should return "Unknown"
		expect(getWeatherCondition(999)).toBe("Unknown");
	});

	it("uses Celsius unit when config specifies celsius and passes correct query params to API", async () => {
		const celsiusConfig: AppConfig = {
			...defaultConfig,
			temperatureUnit: "celsius",
		};

		const celsiusResponse = createOpenMeteoResponse({
			temperature: 9.2,
			weathercode: 61,
			temperatureMax: 11.7,
			temperatureMin: 4.1,
		});

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(celsiusResponse),
		} as Response);

		const result = await weatherModule(celsiusConfig);

		expect(result.success).toBe(true);

		const data = result.data as WeatherData;
		expect(data.currentTemp).toBe(9.2);
		expect(data.condition).toBe("Slight rain");
		expect(data.high).toBe(11.7);
		expect(data.low).toBe(4.1);
		expect(data.unit).toBe("C");

		// Verify the API was called with celsius parameter
		const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
		expect(fetchCall).toContain("temperature_unit=celsius");
	});
});
