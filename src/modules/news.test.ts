import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, NewsModuleData } from "../types.js";
import { newsModule } from "./news.js";

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
};

function mockNewsApiResponse(articles: unknown[]) {
	return {
		ok: true,
		json: async () => ({
			status: "ok",
			totalResults: articles.length,
			articles,
		}),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("NEWSAPI_API_KEY", "test-api-key");
	vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("news module", () => {
	it("returns articles from all four categories", async () => {
		const mockArticle = {
			source: { id: null, name: "Test Source" },
			title: "Test Headline",
			description: "Test description",
			url: "https://example.com/article",
			publishedAt: "2026-01-31T10:00:00Z",
		};

		vi.mocked(fetch).mockResolvedValue(mockNewsApiResponse([mockArticle]) as Response);

		const result = await newsModule(baseConfig);

		expect(result.id).toBe("news");
		expect(result.success).toBe(true);

		const data = result.data as NewsModuleData;
		expect(data.articles).toHaveLength(4);
		expect(data.articles[0].category).toBe("us");
		expect(data.articles[1].category).toBe("tech");
		expect(data.articles[2].category).toBe("business");
		expect(data.articles[3].category).toBe("crypto");
	});

	it("maps NewsAPI fields to NewsArticle shape", async () => {
		const mockArticle = {
			source: { id: "cnn", name: "CNN" },
			title: "Breaking News",
			description: "Something happened.",
			url: "https://cnn.com/article",
			publishedAt: "2026-01-31T08:00:00Z",
		};

		vi.mocked(fetch).mockResolvedValue(mockNewsApiResponse([mockArticle]) as Response);

		const result = await newsModule(baseConfig);
		const data = result.data as NewsModuleData;
		const article = data.articles[0];

		expect(article.headline).toBe("Breaking News");
		expect(article.description).toBe("Something happened.");
		expect(article.sourceName).toBe("CNN");
		expect(article.sourceUrl).toBe("https://cnn.com/article");
		expect(article.publishedAt).toBe("2026-01-31T08:00:00Z");
	});

	it("filters out articles with null or empty titles", async () => {
		const articles = [
			{
				source: { id: null, name: "Source" },
				title: null,
				description: "No title",
				url: "https://example.com/1",
				publishedAt: "2026-01-31T10:00:00Z",
			},
			{
				source: { id: null, name: "Source" },
				title: "",
				description: "Empty title",
				url: "https://example.com/2",
				publishedAt: "2026-01-31T10:00:00Z",
			},
			{
				source: { id: null, name: "Source" },
				title: "Valid Title",
				description: "Has a title",
				url: "https://example.com/3",
				publishedAt: "2026-01-31T10:00:00Z",
			},
		];

		vi.mocked(fetch).mockResolvedValue(mockNewsApiResponse(articles) as Response);

		const result = await newsModule(baseConfig);
		const data = result.data as NewsModuleData;

		// 4 categories, but only 1 valid article per category
		for (const article of data.articles) {
			expect(article.headline).toBe("Valid Title");
		}
	});

	it("throws when NEWSAPI_API_KEY is missing", async () => {
		vi.stubEnv("NEWSAPI_API_KEY", "");

		await expect(newsModule(baseConfig)).rejects.toThrow(
			"NEWSAPI_API_KEY environment variable is not set",
		);
	});

	it("passes apiKey as a query parameter to NewsAPI", async () => {
		const mockArticle = {
			source: { id: null, name: "Source" },
			title: "Headline",
			description: "Desc",
			url: "https://example.com",
			publishedAt: "2026-01-31T10:00:00Z",
		};

		vi.mocked(fetch).mockResolvedValue(mockNewsApiResponse([mockArticle]) as Response);

		await newsModule(baseConfig);

		expect(fetch).toHaveBeenCalledTimes(4);

		for (const call of vi.mocked(fetch).mock.calls) {
			const url = call[0] as string;
			expect(url).toContain("apiKey=test-api-key");
			expect(url).toMatch(/^https:\/\/newsapi\.org\/v2\//);
		}
	});

	it("fetches correct endpoints for each category", async () => {
		const mockArticle = {
			source: { id: null, name: "Source" },
			title: "Headline",
			description: "Desc",
			url: "https://example.com",
			publishedAt: "2026-01-31T10:00:00Z",
		};

		vi.mocked(fetch).mockResolvedValue(mockNewsApiResponse([mockArticle]) as Response);

		await newsModule(baseConfig);

		const urls = vi.mocked(fetch).mock.calls.map((call) => call[0] as string);

		expect(urls[0]).toContain("/v2/top-headlines");
		expect(urls[0]).toContain("country=us");

		expect(urls[1]).toContain("/v2/everything");
		expect(urls[1]).toContain("artificial+intelligence+OR+AI");

		expect(urls[2]).toContain("/v2/top-headlines");
		expect(urls[2]).toContain("category=business");

		expect(urls[3]).toContain("/v2/everything");
		expect(urls[3]).toContain("cryptocurrency+OR+bitcoin+OR+ethereum");
	});
});
