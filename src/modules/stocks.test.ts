import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, StocksModuleData } from "../types.js";
import { stocksModule } from "./stocks.js";

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
	stocks: [{ symbol: "TSLA", name: "Tesla", type: "stock" }],
};

function mockFinnhubQuote(
	c: number,
	d: number,
	dp: number,
	h: number,
	l: number,
	o: number,
	pc: number,
) {
	return {
		ok: true,
		json: async () => ({ c, d, dp, h, l, o, pc }),
	};
}

function mockAlpacaBars(closePrices: number[]) {
	return {
		ok: true,
		json: async () => ({
			bars: closePrices.map((price, i) => ({
				c: price,
				t: new Date(Date.now() - (closePrices.length - i) * 86400 * 1000).toISOString(),
			})),
		}),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("FINNHUB_API_KEY", "test-key");
	vi.stubEnv("ALPACA_API_KEY", "alpaca-key");
	vi.stubEnv("ALPACA_SECRET_KEY", "alpaca-secret");
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("stocks module", () => {
	it("fetches stock quotes successfully from Finnhub", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				// First call: /quote for TSLA
				.mockResolvedValueOnce(
					mockFinnhubQuote(248.5, 5.75, 2.37, 252.0, 244.0, 245.0, 242.75) as unknown as Response,
				)
				// Second call: Alpaca /v2/stocks/TSLA/bars for two-week-ago price
				.mockResolvedValueOnce(mockAlpacaBars([210.0]) as unknown as Response)
				// Third call: Alpaca /v2/stocks/TSLA/bars for year-ago price
				.mockResolvedValueOnce(mockAlpacaBars([180.0, 190.0, 200.0]) as unknown as Response),
		);

		const result = await stocksModule(baseConfig);

		expect(result.id).toBe("stocks");
		expect(result.success).toBe(true);

		const data = result.data as StocksModuleData;
		expect(data.quotes).toHaveLength(1);

		expect(data.quotes[0].symbol).toBe("TSLA");
		expect(data.quotes[0].currentPrice).toBe(248.5);
		expect(data.quotes[0].dailyChange).toBe(5.75);
		expect(data.quotes[0].dailyChangePercent).toBe(2.37);
		expect(data.quotes[0].twoWeekAgoPrice).toBe(210.0);
		expect(data.quotes[0].yearAgoPrice).toBe(180.0);
		expect(data.quotes[0].high).toBe(252.0);
		expect(data.quotes[0].low).toBe(244.0);
		expect(data.quotes[0].open).toBe(245.0);
		expect(data.quotes[0].previousClose).toBe(242.75);
		expect(data.asOf).toBeDefined();
	});

	it("throws when FINNHUB_API_KEY is not set", async () => {
		vi.stubEnv("FINNHUB_API_KEY", "");

		await expect(stocksModule(baseConfig)).rejects.toThrow(
			"FINNHUB_API_KEY environment variable is not set",
		);
	});

	it("throws when Alpaca keys are not set", async () => {
		vi.stubEnv("ALPACA_API_KEY", "");
		vi.stubEnv("ALPACA_SECRET_KEY", "");

		await expect(stocksModule(baseConfig)).rejects.toThrow(
			"ALPACA_API_KEY or ALPACA_SECRET_KEY environment variable is not set",
		);
	});

	it("uses Finnhub /quote and Alpaca /v2/stocks/{symbol}/bars endpoints", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(mockFinnhubQuote(100, 1, 1, 101, 99, 100, 99) as unknown as Response)
			.mockResolvedValueOnce(mockAlpacaBars([95]) as unknown as Response)
			.mockResolvedValueOnce(mockAlpacaBars([80]) as unknown as Response);

		vi.stubGlobal("fetch", mockFetch);

		await stocksModule(baseConfig);

		const firstCallUrl = mockFetch.mock.calls[0][0] as string;
		expect(firstCallUrl).toContain("finnhub.io/api/v1/quote");
		expect(firstCallUrl).toContain("symbol=TSLA");
		expect(firstCallUrl).toContain("token=test-key");

		const secondCallUrl = mockFetch.mock.calls[1][0] as string;
		expect(secondCallUrl).toContain("data.alpaca.markets/v2/stocks/TSLA/bars");
		const thirdCallUrl = mockFetch.mock.calls[2][0] as string;
		expect(thirdCallUrl).toContain("data.alpaca.markets/v2/stocks/TSLA/bars");
	});
});
