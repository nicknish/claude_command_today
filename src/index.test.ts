import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, ModuleResult } from "./types.js";

vi.mock("./config.js", () => ({
	loadConfig: vi.fn(),
}));

vi.mock("./runner.js", () => ({
	runModules: vi.fn(),
}));

vi.mock("./artifact.js", () => ({
	saveArtifact: vi.fn(),
}));

import { saveArtifact } from "./artifact.js";
import { loadConfig } from "./config.js";
import { main } from "./index.js";
import { runModules } from "./runner.js";

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

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("main entry point", () => {
	it("calls config loader, runner, artifact saver, and writes JSON to stdout", async () => {
		const mockResults: ModuleResult[] = [
			{
				id: "greeting",
				success: true,
				data: {
					greeting: "Good morning, Name! Today is Thursday, January 30, 2026.",
					date: "2026-01-30",
				},
			},
			{
				id: "weather",
				success: true,
				data: {
					currentTemp: 45,
					condition: "Clear sky",
					high: 50,
					low: 38,
					unit: "F",
				},
			},
			{
				id: "stocks",
				success: true,
				data: { quotes: [], asOf: "8:00:00 AM" },
			},
			{
				id: "news",
				success: true,
				data: { articles: [] },
			},
		];

		vi.mocked(loadConfig).mockReturnValue(baseConfig);
		vi.mocked(runModules).mockResolvedValue(mockResults);
		vi.mocked(saveArtifact).mockReturnValue("/path/to/artifact.json");

		const stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await main();

		expect(loadConfig).toHaveBeenCalledOnce();
		expect(runModules).toHaveBeenCalledWith(baseConfig);

		// Verify JSON output structure
		const writtenOutput = stdoutWriteSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(writtenOutput);
		expect(parsed).toHaveProperty("greeting");
		expect(parsed).toHaveProperty("weather");
		expect(parsed).toHaveProperty("stocks");
		expect(parsed).toHaveProperty("news");

		// Verify saveArtifact was called with the same JSON string
		expect(saveArtifact).toHaveBeenCalledWith(writtenOutput);

		stdoutWriteSpy.mockRestore();
	});

	it("omits failed ancillary modules from JSON output", async () => {
		const mockResults: ModuleResult[] = [
			{
				id: "greeting",
				success: true,
				data: {
					greeting: "Good morning, Name! Today is Thursday, January 30, 2026.",
					date: "2026-01-30",
				},
			},
			{
				id: "weather",
				success: true,
				data: {
					currentTemp: 45,
					condition: "Clear sky",
					high: 50,
					low: 38,
					unit: "F",
				},
			},
			{ id: "stocks", success: false },
			{ id: "news", success: false },
		];

		vi.mocked(loadConfig).mockReturnValue(baseConfig);
		vi.mocked(runModules).mockResolvedValue(mockResults);
		vi.mocked(saveArtifact).mockReturnValue("/path/to/artifact.json");

		const stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

		await main();

		const writtenOutput = stdoutWriteSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(writtenOutput);

		// Successful modules should be present
		expect(parsed).toHaveProperty("greeting");
		expect(parsed).toHaveProperty("weather");

		// Failed ancillary modules should be omitted
		expect(parsed).not.toHaveProperty("stocks");
		expect(parsed).not.toHaveProperty("news");

		stdoutWriteSpy.mockRestore();
	});

	it("exits with error JSON when a core module fails", async () => {
		const coreError = new Error("weather API is down");
		const mockResults: ModuleResult[] = [
			{
				id: "greeting",
				success: true,
				data: {
					greeting: "Good morning, Name! Today is Thursday, January 30, 2026.",
					date: "2026-01-30",
				},
			},
			{ id: "weather", success: false, error: coreError },
			{ id: "stocks", success: false },
			{ id: "news", success: false },
		];

		vi.mocked(loadConfig).mockReturnValue(baseConfig);
		vi.mocked(runModules).mockResolvedValue(mockResults);

		const stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

		await main();

		// Should write error JSON to stdout
		const writtenOutput = stdoutWriteSpy.mock.calls[0][0] as string;
		const parsed = JSON.parse(writtenOutput);
		expect(parsed).toEqual({
			error: true,
			coreFailures: ["weather"],
		});

		// Should call process.exit(1)
		expect(exitSpy).toHaveBeenCalledWith(1);

		stdoutWriteSpy.mockRestore();
		exitSpy.mockRestore();
	});
});
