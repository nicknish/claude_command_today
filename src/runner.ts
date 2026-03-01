import { logError } from "./logger.js";
import { cryptoModule } from "./modules/crypto.js";
import { financeNewsModule } from "./modules/finance-news.js";
import { greetingModule } from "./modules/greeting.js";
import { newsModule } from "./modules/news.js";
import { stocksModule } from "./modules/stocks.js";
import { todoistModule } from "./modules/todoist.js";
import { weatherModule } from "./modules/weather.js";
import type { AppConfig, ModuleFn, ModuleResult } from "./types.js";

const moduleRegistry: Record<string, ModuleFn> = {
	greeting: greetingModule,
	weather: weatherModule,
	stocks: stocksModule,
	crypto: cryptoModule,
	news: newsModule,
	financeNews: financeNewsModule,
	todoist: todoistModule,
};

export async function runModules(config: AppConfig): Promise<ModuleResult[]> {
	const results: ModuleResult[] = [];

	for (const entry of config.modules) {
		if (!entry.enabled) {
			continue;
		}

		const moduleFn = moduleRegistry[entry.id];
		if (!moduleFn) {
			continue;
		}

		try {
			const result = await moduleFn(config);
			results.push({ id: entry.id, success: true, data: result.data });
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));

			if (entry.type === "core") {
				results.push({ id: entry.id, success: false, error });
			} else {
				logError(entry.id, error);
				results.push({ id: entry.id, success: false });
			}
		}
	}

	return results;
}
