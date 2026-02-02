import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveArtifact } from "./artifact.js";

vi.mock("node:fs");

const artifactsDir = path.resolve(import.meta.dirname, "..", "artifacts");

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("artifact system", () => {
	it("saves JSON content to artifacts/YYYY-MM-DD-HH-MM-SS.json using local time", () => {
		// Set a specific local time: 2026-01-30 09:15:42
		vi.setSystemTime(new Date(2026, 0, 30, 9, 15, 42));

		const content = '{ "greeting": "Good morning, Name!" }';

		const result = saveArtifact(content);

		const expectedFilename = "2026-01-30-09-15-42.json";
		const expectedPath = path.join(artifactsDir, expectedFilename);

		expect(result).toBe(expectedPath);
		expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, content, "utf-8");
	});

	it("creates the artifacts/ directory if it does not exist", () => {
		vi.setSystemTime(new Date(2026, 0, 30, 14, 0, 0));

		saveArtifact('{ "test": true }');

		expect(fs.mkdirSync).toHaveBeenCalledWith(artifactsDir, { recursive: true });
	});

	it("does not overwrite existing files (two saves one second apart produce two distinct files)", () => {
		vi.setSystemTime(new Date(2026, 0, 30, 10, 0, 0));

		const path1 = saveArtifact('{ "first": true }');

		// Advance time by one second
		vi.setSystemTime(new Date(2026, 0, 30, 10, 0, 1));

		const path2 = saveArtifact('{ "second": true }');

		expect(path1).not.toBe(path2);
		expect(path1).toContain("2026-01-30-10-00-00.json");
		expect(path2).toContain("2026-01-30-10-00-01.json");
		expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
	});
});
