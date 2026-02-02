import fs from "node:fs";
import path from "node:path";

const logsDir = path.resolve(import.meta.dirname, "..", "logs");
const errorLogPath = path.join(logsDir, "errors.log");

export function logError(moduleId: string, error: Error): void {
	fs.mkdirSync(logsDir, { recursive: true });

	const timestamp = new Date().toISOString();
	const entry = `[${timestamp}] [${moduleId}] Error: ${error.message}\nStack: ${error.stack}\n\n`;

	fs.appendFileSync(errorLogPath, entry, "utf-8");
}
