export type ModuleResult = {
	id: string;
	success: boolean;
	data?: unknown;
	error?: Error;
};

export type ModuleFn = (config: AppConfig) => Promise<ModuleResult>;

export type ModuleEntry = {
	id: string;
	enabled: boolean;
	type: "core" | "ancillary";
};

export type CryptoSymbol = {
	id: string;
	symbol: string;
};

export type AppConfig = {
	name: string;
	location: {
		latitude: number;
		longitude: number;
		label: string;
	};
	temperatureUnit: "fahrenheit" | "celsius";
	modules: ModuleEntry[];
	stocks?: StockSymbol[];
	crypto?: CryptoSymbol[];
};

export type GreetingData = {
	greeting: string;
	date: string;
};

export type WeatherData = {
	currentTemp: number;
	condition: string;
	high: number;
	low: number;
	unit: string;
	weatherCode: number;
	windSpeed: number;
	windDirection: number;
	humidity: number;
	hourlyTime: string[];
	hourlyTemperature: number[];
	hourlyPrecipitationProbability: number[];
	hourlyWindSpeed: number[];
	hourlyHumidity: number[];
	location: string;
};

export type StockSymbol = {
	symbol: string;
	name: string;
	type: "stock" | "crypto";
};

export type StockQuoteData = {
	symbol: string;
	currentPrice: number;
	dailyChange: number;
	dailyChangePercent: number;
	twoWeekAgoPrice: number;
	twoWeekChange: number;
	twoWeekChangePercent: number;
	yearAgoPrice: number;
	yearChange: number;
	yearChangePercent: number;
	high: number;
	low: number;
	open: number;
	previousClose: number;
};

export type StocksModuleData = {
	quotes: StockQuoteData[];
	asOf: string;
};

export type CryptoQuoteData = {
	id: string;
	symbol: string;
	currentPrice: number;
	dailyChange: number;
	dailyChangePercent: number;
	twoWeekAgoPrice: number;
	twoWeekChange: number;
	twoWeekChangePercent: number;
	yearAgoPrice: number;
	yearChange: number;
	yearChangePercent: number;
};

export type CryptoModuleData = {
	coins: CryptoQuoteData[];
};

export type NewsArticle = {
	headline: string;
	description: string;
	sourceName: string;
	sourceUrl: string;
	publishedAt: string;
	category: "us" | "tech" | "business" | "crypto";
};

export type NewsModuleData = {
	articles: NewsArticle[];
};

export type FinanceNewsArticle = {
	headline: string;
	summary: string;
	source: string;
	url: string;
	datetime: string;
	category: string;
};

export type FinanceNewsModuleData = {
	articles: FinanceNewsArticle[];
};
