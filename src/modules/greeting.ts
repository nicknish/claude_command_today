import type { AppConfig, GreetingData, ModuleResult } from "../types.js";

function getTimePeriod(hour: number): string {
	if (hour < 12) return "morning";
	if (hour < 17) return "afternoon";
	return "evening";
}

function formatDate(now: Date): string {
	const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);
	const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(now);
	const day = now.getDate();
	const year = now.getFullYear();

	return `${dayOfWeek}, ${month} ${day}, ${year}`;
}

export async function greetingModule(config: AppConfig): Promise<ModuleResult> {
	const now = new Date();
	const hour = now.getHours();
	const period = getTimePeriod(hour);
	const dateString = formatDate(now);

	const greeting = `Good ${period}, ${config.name}! Today is ${dateString}.`;

	const data: GreetingData = {
		greeting,
		date: now.toISOString(),
	};

	return {
		id: "greeting",
		success: true,
		data,
	};
}
