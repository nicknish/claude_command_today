/**
 * WMO Weather interpretation codes (WW)
 * Maps numeric codes from the Open-Meteo API to human-readable descriptions.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
export const wmoWeatherCodes: Record<number, string> = {
	0: "Clear sky",
	1: "Mainly clear",
	2: "Partly cloudy",
	3: "Overcast",
	45: "Foggy",
	48: "Depositing rime fog",
	51: "Light drizzle",
	53: "Moderate drizzle",
	55: "Dense drizzle",
	56: "Light freezing drizzle",
	57: "Dense freezing drizzle",
	61: "Slight rain",
	63: "Moderate rain",
	65: "Heavy rain",
	66: "Light freezing rain",
	67: "Heavy freezing rain",
	71: "Slight snow",
	73: "Moderate snow",
	75: "Heavy snow",
	77: "Snow grains",
	80: "Slight rain showers",
	81: "Moderate rain showers",
	82: "Violent rain showers",
	85: "Slight snow showers",
	86: "Heavy snow showers",
	95: "Thunderstorm",
	96: "Thunderstorm with slight hail",
	99: "Thunderstorm with heavy hail",
};

/**
 * Returns the human-readable description for a WMO weather code.
 * Falls back to "Unknown" for unmapped codes.
 */
export function getWeatherCondition(code: number): string {
	return wmoWeatherCodes[code] ?? "Unknown";
}
