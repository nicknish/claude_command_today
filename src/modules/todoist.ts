import type { AppConfig, ModuleResult, TodoistModuleData, TodoistTask } from "../types.js";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";
const TODOIST_FILTER = "(overdue | today) & p1";

function getApiKey(): string {
	const key = process.env.TODOIST_API_KEY;
	if (!key) {
		throw new Error(
			"TODOIST_API_KEY environment variable is not set. " +
				"Generate a Todoist API token and add it to .env.development",
		);
	}
	return key;
}

type TodoistDue = {
	date: string | null;
	datetime: string | null;
	timezone: string | null;
};

type TodoistApiTask = {
	id: string;
	content: string;
	description: string;
	priority: number;
	due: TodoistDue | null;
	url: string;
	created_at: string;
	project_id: string;
	labels: string[];
};

function getDueTimestamp(due: TodoistDue | null): number | null {
	if (!due) return null;
	if (due.datetime) {
		return new Date(due.datetime).getTime();
	}
	if (due.date) {
		return new Date(`${due.date}T23:59:59`).getTime();
	}
	return null;
}

function isDueTodayOrEarlier(due: TodoistDue | null, now: Date): boolean {
	const dueTimestamp = getDueTimestamp(due);
	if (dueTimestamp === null) return false;

	const endOfToday = new Date(now);
	endOfToday.setHours(23, 59, 59, 999);
	return dueTimestamp <= endOfToday.getTime();
}

function isOlderThanTwoWeeks(createdAt: string, now: Date): boolean {
	const created = new Date(createdAt);
	const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
	return now.getTime() - created.getTime() >= twoWeeksMs;
}

function mapTask(task: TodoistApiTask, now: Date): TodoistTask {
	return {
		id: task.id,
		content: task.content,
		description: task.description ?? "",
		priority: task.priority,
		dueDate: task.due?.date ?? null,
		dueDatetime: task.due?.datetime ?? null,
		dueTimezone: task.due?.timezone ?? null,
		url: task.url,
		createdAt: task.created_at,
		projectId: task.project_id,
		labels: task.labels ?? [],
		isOlderThanTwoWeeks: isOlderThanTwoWeeks(task.created_at, now),
	};
}

async function fetchTodoistTasks(apiKey: string): Promise<TodoistApiTask[]> {
	const params = new URLSearchParams({ filter: TODOIST_FILTER });
	const url = `${TODOIST_BASE}/tasks?${params.toString()}`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Todoist /tasks request failed with status ${response.status}`);
	}

	return (await response.json()) as TodoistApiTask[];
}

export async function todoistModule(_config: AppConfig): Promise<ModuleResult> {
	const apiKey = getApiKey();
	const now = new Date();
	const tasks = await fetchTodoistTasks(apiKey);

	const filtered = tasks
		.filter((task) => task.priority === 4)
		.filter((task) => isDueTodayOrEarlier(task.due, now))
		.map((task) => mapTask(task, now));

	const data: TodoistModuleData = {
		tasks: filtered,
		asOf: now.toISOString(),
	};

	return {
		id: "todoist",
		success: true,
		data,
	};
}
