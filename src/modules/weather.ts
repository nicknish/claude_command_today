import type { AppConfig, ModuleResult, WeatherData } from "../types.js";
import { getWeatherCondition } from "./weather-codes.js";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function weatherModule(config: AppConfig): Promise<ModuleResult> {
	const { latitude, longitude, label } = config.location;
	const temperatureUnit = config.temperatureUnit;

	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m",
		hourly: "temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m",
		daily: "temperature_2m_max,temperature_2m_min",
		temperature_unit: temperatureUnit,
		timezone: "auto",
		forecast_days: "2",
	});

	const url = `${OPEN_METEO_BASE_URL}?${params.toString()}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Open-Meteo API request failed with status ${response.status}`);
	}

	const json = await response.json();

	// Current conditions from the "current" response block
	const currentTemp: number = json.current.temperature_2m;
	const weatherCode: number = json.current.weather_code;
	const windSpeed: number = json.current.wind_speed_10m;
	const windDirection: number = json.current.wind_direction_10m;
	const humidity: number = json.current.relative_humidity_2m;

	// Daily high/low (first day)
	const high: number = json.daily.temperature_2m_max[0];
	const low: number = json.daily.temperature_2m_min[0];

	// Hourly arrays -- return all data (both days) and let Claude interpret
	const hourlyTime: string[] = json.hourly.time;
	const hourlyTemperature: number[] = json.hourly.temperature_2m;
	const hourlyPrecipitationProbability: number[] = json.hourly.precipitation_probability;
	const hourlyWindSpeed: number[] = json.hourly.wind_speed_10m;
	const hourlyHumidity: number[] = json.hourly.relative_humidity_2m;

	const condition = getWeatherCondition(weatherCode);
	const unit = temperatureUnit === "celsius" ? "C" : "F";

	const data: WeatherData = {
		currentTemp,
		condition,
		high,
		low,
		unit,
		weatherCode,
		windSpeed,
		windDirection,
		humidity,
		hourlyTime,
		hourlyTemperature,
		hourlyPrecipitationProbability,
		hourlyWindSpeed,
		hourlyHumidity,
		location: label,
	};

	return {
		id: "weather",
		success: true,
		data,
	};
}
