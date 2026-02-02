import path from "node:path";
import dotenv from "dotenv";
import { saveArtifact } from "./artifact.js";
import { loadConfig } from "./config.js";
import { runModules } from "./runner.js";

export async function main(): Promise<void> {
	dotenv.config({
		path: path.resolve(import.meta.dirname, "..", ".env.development"),
	});

	const config = loadConfig();
	const results = await runModules(config);

	// Check for core module failures
	const coreFailures: string[] = [];
	for (const result of results) {
		if (!result.success) {
			const entry = config.modules.find((m) => m.id === result.id);
			if (entry?.type === "core") {
				coreFailures.push(result.id);
			}
		}
	}

	if (coreFailures.length > 0) {
		const errorJson = JSON.stringify({ error: true, coreFailures }, null, 2);
		process.stdout.write(errorJson);
		process.exit(1);
	}

	// Assemble output keyed by module id, omitting failed ancillary modules
	const output: Record<string, unknown> = {};
	for (const result of results) {
		if (result.success) {
			output[result.id] = result.data;
		}
	}

	const jsonString = JSON.stringify(output, null, 2);
	saveArtifact(jsonString);
	process.stdout.write(jsonString);
}

/* Auto-invoke when run as the entry point (not during tests). */
const isDirectRun =
	typeof process !== "undefined" &&
	process.argv[1] &&
	import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
