import process from "node:process";
import type {
	AppConfig,
	CryptoModuleData,
	CryptoQuoteData,
	CryptoSymbol,
	ModuleResult,
} from "../types.js";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const ALPACA_BASE = "https://data.alpaca.markets";
const ALPACA_CRYPTO_BARS_URL = `${ALPACA_BASE}/v1beta3/crypto/us/bars`;

const DEFAULT_COINS: CryptoSymbol[] = [
	{ id: "bitcoin", symbol: "BTC" },
	{ id: "ethereum", symbol: "ETH" },
	{ id: "solana", symbol: "SOL" },
];

function getApiKey(): string {
	const key = process.env.COINGECKO_API_KEY;
	if (!key) {
		throw new Error("COINGECKO_API_KEY is not set. Please add it to your .env.development file.");
	}
	return key;
}

function getAlpacaCredentials(): { apiKey: string; secretKey: string } {
	const apiKey = process.env.ALPACA_API_KEY;
	const secretKey = process.env.ALPACA_SECRET_KEY;

	if (!apiKey || !secretKey) {
		throw new Error(
			"ALPACA_API_KEY or ALPACA_SECRET_KEY environment variable is not set. " +
				"Add them to .env.development to enable Alpaca historical data.",
		);
	}

	return { apiKey, secretKey };
}

async function fetchCurrentPrice(
	coinId: string,
	apiKey: string,
): Promise<{
	usd: number;
	usd_24h_change: number;
}> {
	const params = new URLSearchParams({
		ids: coinId,
		vs_currencies: "usd",
		include_24hr_change: "true",
		x_cg_demo_api_key: apiKey,
	});

	const url = `${COINGECKO_BASE_URL}/simple/price?${params.toString()}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`CoinGecko /simple/price request failed for ${coinId} with status ${response.status}`,
		);
	}

	const json = await response.json();

	if (!json[coinId]) {
		throw new Error(`CoinGecko /simple/price returned no data for coin id "${coinId}"`);
	}

	return {
		usd: json[coinId].usd,
		usd_24h_change: json[coinId].usd_24h_change,
	};
}

async function fetchHistoricalPrice(
	symbol: string,
	apiKey: string,
	secretKey: string,
	daysAgo: number,
): Promise<number> {
	const now = new Date();
	const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
	const pair = `${symbol}/USD`;

	const params = new URLSearchParams({
		symbols: pair,
		timeframe: "1Day",
		start: startDate.toISOString(),
		limit: "1",
		sort: "asc",
	});

	const url = `${ALPACA_CRYPTO_BARS_URL}?${params.toString()}`;
	const response = await fetch(url, {
		headers: {
			"APCA-API-KEY-ID": apiKey,
			"APCA-API-SECRET-KEY": secretKey,
		},
	});

	if (!response.ok) {
		throw new Error(
			`Alpaca /v1beta3/crypto/us/bars request failed with status ${response.status}`,
		);
	}

	const json = (await response.json()) as {
		bars?: Record<string, Array<{ c: number }>>;
	};

	const bar = json.bars?.[pair]?.[0];

	if (!bar || typeof bar.c !== "number") {
		throw new Error(`Alpaca returned no bar data for ${pair} -- historical data unavailable`);
	}

	return bar.c;
}

export async function cryptoModule(config: AppConfig): Promise<ModuleResult> {
	const apiKey = getApiKey();
	const alpacaCredentials = getAlpacaCredentials();
	const coins = config.crypto ?? DEFAULT_COINS;

	const cryptoQuotes: CryptoQuoteData[] = [];

	// Fetch coins sequentially to respect the 10-30 req/min rate limit
	for (const coin of coins) {
		const currentData = await fetchCurrentPrice(coin.id, apiKey);
		const twoWeekAgoPrice = await fetchHistoricalPrice(
			coin.symbol,
			alpacaCredentials.apiKey,
			alpacaCredentials.secretKey,
			14,
		);
		const yearAgoPrice = await fetchHistoricalPrice(
			coin.symbol,
			alpacaCredentials.apiKey,
			alpacaCredentials.secretKey,
			365,
		);

		const currentPrice = currentData.usd;
		const dailyChangePercent = currentData.usd_24h_change;
		const dailyChange = currentPrice * (dailyChangePercent / 100);

		const twoWeekChange = currentPrice - twoWeekAgoPrice;
		const twoWeekChangePercent =
			twoWeekAgoPrice !== 0 ? (twoWeekChange / twoWeekAgoPrice) * 100 : 0;
		const yearChange = currentPrice - yearAgoPrice;
		const yearChangePercent = yearAgoPrice !== 0 ? (yearChange / yearAgoPrice) * 100 : 0;

		cryptoQuotes.push({
			id: coin.id,
			symbol: coin.symbol,
			currentPrice,
			dailyChange,
			dailyChangePercent,
			twoWeekAgoPrice,
			twoWeekChange,
			twoWeekChangePercent,
			yearAgoPrice,
			yearChange,
			yearChangePercent,
		});
	}

	const data: CryptoModuleData = {
		coins: cryptoQuotes,
	};

	return {
		id: "crypto",
		success: true,
		data,
	};
}
