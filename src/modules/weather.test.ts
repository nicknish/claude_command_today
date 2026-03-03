import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, WeatherData } from "../types.js";
import { weatherModule } from "./weather.js";
import { getWeatherCondition } from "./weather-codes.js";

/**
 * Canned Open-Meteo API response matching the current API fields
 * (current.temperature_2m, current.weather_code, etc.)
 */
function createOpenMeteoResponse(overrides?: {
	temperature?: number;
	weatherCode?: number;
	temperatureMax?: number;
	temperatureMin?: number;
}) {
	return {
		current: {
			temperature_2m: overrides?.temperature ?? 48.5,
			weather_code: overrides?.weatherCode ?? 0,
			wind_speed_10m: 8.2,
			wind_direction_10m: 210,
			relative_humidity_2m: 65,
		},
		daily: {
			time: ["2026-01-30", "2026-01-31"],
			temperature_2m_max: [overrides?.temperatureMax ?? 53.1, 55.0],
			temperature_2m_min: [overrides?.temperatureMin ?? 39.4, 41.0],
		},
		hourly: {
			time: ["2026-01-30T00:00", "2026-01-30T01:00"],
			temperature_2m: [45.0, 44.5],
			precipitation_probability: [10, 15],
			wind_speed_10m: [5.0, 6.0],
			relative_humidity_2m: [70, 72],
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
		{ id: "weather", enabled: true, type: "ancillary" },
	],
	stocks: [],
	crypto: [],
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(createOpenMeteoResponse()),
		}),
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("weather module", () => {
	it("parses a successful Open-Meteo API response", async () => {
		const resultPromise = weatherModule(defaultConfig);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result.id).toBe("weather");
		expect(result.success).toBe(true);

		const data = result.data as WeatherData;
		expect(data.currentTemp).toBe(48.5);
		expect(data.condition).toBe("Clear sky");
		expect(data.high).toBe(53.1);
		expect(data.low).toBe(39.4);
		expect(data.unit).toBe("F");
	});

	it("correctly maps WMO weather codes to human-readable condition strings", () => {
		expect(getWeatherCondition(0)).toBe("Clear sky");
		expect(getWeatherCondition(1)).toBe("Mainly clear");
		expect(getWeatherCondition(3)).toBe("Overcast");
		expect(getWeatherCondition(61)).toBe("Slight rain");
		expect(getWeatherCondition(95)).toBe("Thunderstorm");
		expect(getWeatherCondition(999)).toBe("Unknown");
	});

	it("uses Celsius unit when config specifies celsius", async () => {
		const celsiusConfig: AppConfig = {
			...defaultConfig,
			temperatureUnit: "celsius",
		};

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve(
					createOpenMeteoResponse({
						temperature: 9.2,
						weatherCode: 61,
						temperatureMax: 11.7,
						temperatureMin: 4.1,
					}),
				),
		} as Response);

		const resultPromise = weatherModule(celsiusConfig);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result.success).toBe(true);
		const data = result.data as WeatherData;
		expect(data.currentTemp).toBe(9.2);
		expect(data.condition).toBe("Slight rain");
		expect(data.unit).toBe("C");
	});

	it("retries on fetch failure and succeeds on second attempt", async () => {
		const mockFetch = vi.mocked(fetch);
		mockFetch.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(createOpenMeteoResponse()),
		} as Response);

		const resultPromise = weatherModule(defaultConfig);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result.success).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("retries on non-ok response and succeeds on third attempt", async () => {
		const mockFetch = vi.mocked(fetch);
		mockFetch
			.mockResolvedValueOnce({ ok: false, status: 503 } as Response)
			.mockResolvedValueOnce({ ok: false, status: 503 } as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(createOpenMeteoResponse()),
			} as Response);

		const resultPromise = weatherModule(defaultConfig);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result.success).toBe(true);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("throws after exhausting all retries", async () => {
		vi.useRealTimers();
		vi.mocked(fetch).mockImplementation(() => Promise.reject(new Error("network error")));

		await expect(weatherModule(defaultConfig)).rejects.toThrow("network error");
		expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
	});
});
