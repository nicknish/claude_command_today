import type { AppConfig, ModuleResult, NewsArticle, NewsModuleData } from "../types.js";

const NEWSAPI_BASE = "https://newsapi.org";

function getApiKey(): string {
	const key = process.env.NEWSAPI_API_KEY;
	if (!key) {
		throw new Error(
			"NEWSAPI_API_KEY environment variable is not set. " +
				"Get a free API key at https://newsapi.org/ and add it to .env.development",
		);
	}
	return key;
}

type NewsApiArticle = {
	source: { id: string | null; name: string };
	title: string | null;
	description: string | null;
	url: string;
	publishedAt: string;
};

type NewsApiResponse = {
	status: string;
	totalResults: number;
	articles: NewsApiArticle[];
};

type CategoryConfig = {
	endpoint: string;
	params: Record<string, string>;
	category: NewsArticle["category"];
};

const CATEGORY_CONFIGS: CategoryConfig[] = [
	{
		endpoint: "/v2/top-headlines",
		params: { country: "us" },
		category: "us",
	},
	{
		endpoint: "/v2/everything",
		params: { q: "artificial intelligence OR AI" },
		category: "tech",
	},
	{
		endpoint: "/v2/top-headlines",
		params: { category: "business", country: "us" },
		category: "business",
	},
	{
		endpoint: "/v2/everything",
		params: { q: "cryptocurrency OR bitcoin OR ethereum" },
		category: "crypto",
	},
];

function isValidTitle(title: string | null | undefined): title is string {
	if (!title) return false;
	const trimmed = title.trim();
	return trimmed.length > 0 && trimmed !== "[Removed]";
}

const MAX_ARTICLES_PER_CATEGORY = 8;

function parseArticles(raw: NewsApiArticle[], category: NewsArticle["category"]): NewsArticle[] {
	return raw
		.filter((article) => isValidTitle(article.title))
		.slice(0, MAX_ARTICLES_PER_CATEGORY)
		.map((article) => ({
			headline: article.title as string,
			description: article.description ?? "",
			url: article.url,
			category,
		}));
}

async function fetchCategory(config: CategoryConfig, apiKey: string): Promise<NewsArticle[]> {
	const params = new URLSearchParams({
		...config.params,
		apiKey,
	});

	const url = `${NEWSAPI_BASE}${config.endpoint}?${params.toString()}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`NewsAPI ${config.endpoint} request failed for category "${config.category}" with status ${response.status}`,
		);
	}

	const data = (await response.json()) as NewsApiResponse;

	if (data.status !== "ok") {
		throw new Error(
			`NewsAPI returned non-ok status for category "${config.category}": ${data.status}`,
		);
	}

	return parseArticles(data.articles, config.category);
}

export async function newsModule(_config: AppConfig): Promise<ModuleResult> {
	const apiKey = getApiKey();
	const allArticles: NewsArticle[] = [];

	// Fetch categories sequentially to be a good API citizen (100 req/day limit)
	for (const categoryConfig of CATEGORY_CONFIGS) {
		const articles = await fetchCategory(categoryConfig, apiKey);
		allArticles.push(...articles);
	}

	const data: NewsModuleData = {
		articles: allArticles,
	};

	return {
		id: "news",
		success: true,
		data,
	};
}
