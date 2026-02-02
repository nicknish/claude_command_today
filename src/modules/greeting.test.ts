import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../types.js";
import { greetingModule } from "./greeting.js";

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
		{ id: "morning-brew", enabled: true, type: "ancillary" },
	],
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("greeting module", () => {
	it("returns greeting with 'Good morning' when hour is before 12, includes user name and formatted date", async () => {
		// Thursday, January 30, 2026 at 8:30 AM local time
		vi.setSystemTime(new Date(2026, 0, 30, 8, 30, 0));

		const result = await greetingModule(baseConfig);

		expect(result.id).toBe("greeting");
		expect(result.success).toBe(true);

		const data = result.data as { greeting: string; date: string };
		expect(data.greeting).toBe("Good morning, Name! Today is Friday, January 30, 2026.");
		expect(data.date).toBe(new Date(2026, 0, 30, 8, 30, 0).toISOString());
	});

	it("returns greeting with 'Good afternoon' when hour is between 12 and 16", async () => {
		// January 30, 2026 at 2:00 PM local time
		vi.setSystemTime(new Date(2026, 0, 30, 14, 0, 0));

		const result = await greetingModule(baseConfig);

		expect(result.success).toBe(true);

		const data = result.data as { greeting: string; date: string };
		expect(data.greeting).toContain("Good afternoon");
		expect(data.greeting).toContain("Name");
	});

	it("returns greeting with 'Good evening' when hour is 17 or later", async () => {
		// January 30, 2026 at 7:00 PM local time
		vi.setSystemTime(new Date(2026, 0, 30, 19, 0, 0));

		const result = await greetingModule(baseConfig);

		expect(result.success).toBe(true);

		const data = result.data as { greeting: string; date: string };
		expect(data.greeting).toContain("Good evening");
		expect(data.greeting).toContain("Name");
	});
});
