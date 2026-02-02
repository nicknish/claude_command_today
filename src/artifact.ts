import fs from "node:fs";
import path from "node:path";

const artifactsDir = path.resolve(import.meta.dirname, "..", "artifacts");

/**
 * Generates a filename from the current local time in YYYY-MM-DD-HH-MM-SS.json format.
 */
function generateFilename(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");

	return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}.json`;
}

/**
 * Saves the final JSON output to the artifacts/ directory.
 * Creates the directory if it does not exist.
 * Returns the absolute path of the saved file.
 */
export function saveArtifact(content: string): string {
	fs.mkdirSync(artifactsDir, { recursive: true });

	const filename = generateFilename();
	const filePath = path.join(artifactsDir, filename);

	fs.writeFileSync(filePath, content, "utf-8");

	return filePath;
}
