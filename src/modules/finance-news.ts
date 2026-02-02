import type {
	AppConfig,
	FinanceNewsArticle,
	FinanceNewsModuleData,
	ModuleResult,
} from "../types.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

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

type FinnhubNewsItem = {
	category: string;
	datetime: number;
	headline: string;
	id: number;
	image: string;
	related: string;
	source: string;
	summary: string;
	url: string;
};

export async function financeNewsModule(_config: AppConfig): Promise<ModuleResult> {
	const apiKey = getApiKey();

	const url = `${FINNHUB_BASE}/news?category=general&token=${apiKey}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Finnhub /news request failed with status ${response.status}`);
	}

	const items = (await response.json()) as FinnhubNewsItem[];

	const articles: FinanceNewsArticle[] = items.map((item) => ({
		headline: item.headline,
		summary: item.summary,
		source: item.source,
		url: item.url,
		datetime: new Date(item.datetime * 1000).toISOString(),
		category: item.category,
	}));

	const data: FinanceNewsModuleData = {
		articles,
	};

	return {
		id: "financeNews",
		success: true,
		data,
	};
}
