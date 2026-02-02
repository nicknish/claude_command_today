import type { AppConfig, ModuleResult, StockQuoteData, StocksModuleData } from "../types.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const ALPACA_BASE = "https://data.alpaca.markets";

function getApiKey(): string {
	const key = process.env.FINNHUB_API_KEY;
	if (!key) {
		throw new Error(
			"FINNHUB_API_KEY environment variable is not set. " +
				"Get a free API key at https://finnhub.io/ and add it to .env.development",
		);
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

type FinnhubQuoteResponse = {
	c: number; // current price
	d: number; // daily change
	dp: number; // daily change percent
	h: number; // high
	l: number; // low
	o: number; // open
	pc: number; // previous close
};

type AlpacaBarsResponse = {
	bars?: Array<{
		t: string;
		c: number;
	}>;
};

async function fetchQuote(symbol: string, apiKey: string): Promise<FinnhubQuoteResponse> {
	const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Finnhub /quote request failed for ${symbol} with status ${response.status}`);
	}

	const data = (await response.json()) as FinnhubQuoteResponse;

	if (data.c === 0 && data.d === 0 && data.dp === 0) {
		throw new Error(
			`Finnhub returned zero values for ${symbol} -- symbol may be invalid or market data unavailable`,
		);
	}

	return data;
}

async function fetchHistoricalPrice(
	symbol: string,
	apiKey: string,
	secretKey: string,
	daysAgo: number,
): Promise<number> {
	const now = new Date();
	const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

	const params = new URLSearchParams({
		timeframe: "1Day",
		start: startDate.toISOString(),
		limit: "1",
		adjustment: "raw",
		sort: "asc",
	});

	const url = `${ALPACA_BASE}/v2/stocks/${encodeURIComponent(symbol)}/bars?${params.toString()}`;
	const response = await fetch(url, {
		headers: {
			"APCA-API-KEY-ID": apiKey,
			"APCA-API-SECRET-KEY": secretKey,
		},
	});

	if (!response.ok) {
		throw new Error(
			`Alpaca /v2/stocks/${symbol}/bars request failed with status ${response.status}`,
		);
	}

	const data = (await response.json()) as AlpacaBarsResponse;
	const bar = data.bars?.[0];

	if (!bar || typeof bar.c !== "number") {
		throw new Error(`Alpaca returned no bar data for ${symbol} -- historical data unavailable`);
	}

	return bar.c;
}

export async function stocksModule(config: AppConfig): Promise<ModuleResult> {
	const apiKey = getApiKey();
	const alpacaCredentials = getAlpacaCredentials();
	const symbols = (config.stocks ?? []).filter((s) => s.type === "stock");
	const quotes: StockQuoteData[] = [];

	// Fetch sequentially to respect Finnhub 60 req/min rate limit
	for (const stock of symbols) {
		const quote = await fetchQuote(stock.symbol, apiKey);
		const twoWeekAgoPrice = await fetchHistoricalPrice(
			stock.symbol,
			alpacaCredentials.apiKey,
			alpacaCredentials.secretKey,
			14,
		);
		const yearAgoPrice = await fetchHistoricalPrice(
			stock.symbol,
			alpacaCredentials.apiKey,
			alpacaCredentials.secretKey,
			365,
		);

		const twoWeekChange = quote.c - twoWeekAgoPrice;
		const twoWeekChangePercent =
			twoWeekAgoPrice !== 0 ? (twoWeekChange / twoWeekAgoPrice) * 100 : 0;
		const yearChange = quote.c - yearAgoPrice;
		const yearChangePercent = yearAgoPrice !== 0 ? (yearChange / yearAgoPrice) * 100 : 0;

		const quoteData: StockQuoteData = {
			symbol: stock.symbol,
			currentPrice: quote.c,
			dailyChange: quote.d,
			dailyChangePercent: quote.dp,
			twoWeekAgoPrice,
			twoWeekChange,
			twoWeekChangePercent,
			yearAgoPrice,
			yearChange,
			yearChangePercent,
			high: quote.h,
			low: quote.l,
			open: quote.o,
			previousClose: quote.pc,
		};

		quotes.push(quoteData);
	}

	const data: StocksModuleData = {
		quotes,
		asOf: new Date().toISOString(),
	};

	return {
		id: "stocks",
		success: true,
		data,
	};
}
