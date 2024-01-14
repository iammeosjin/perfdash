export enum Team {
	OPEXA = 'opexa',
	NEXIUX = 'nexiux',
}

export type ID = string[];

export type KVEntry = {
	id: ID;
};

export type IntegrationUser = {
	id: ID;
	user: ID;
};

export type User =
	& {
		id: ID;
		name: string;
		username: string;
		level: number;
		department: 'BACKEND' | 'FRONTEND' | 'SQA';
	}
	& Partial<{
		slack: string;
		github: string;
		jira: string;
		teams: Team[];
		image: string;
		role: 'SA' | 'INFRA';
	}>;

export type PullRequestSummary = {
	pullRequestCreated: number;
	pullRequestReviewed: number;
	pullRequestReviewTime: number;
	pullRequestPoints: number;
};

export enum TaskCycleSummaryType {
	BUG = 'BUG',
	STORY = 'STORY',
	TASK = 'TASK',
}

export type TaskCycleSummary = {
	type: TaskCycleSummaryType;
	taskDoneCount: number;
	taskDoneCycleTime: number;
	taskCyclePoints: number;
};

export type WeeklySummary = {
	id: ID; // [team, year, month, weekNumber, user]
	user: ID;
	weekNumber: number;
	weekYear: number;
	pullRequestSummary?: PullRequestSummary;
	taskCycleSummaries?: TaskCycleSummary[];
};

export type UserWeeklySummary = {
	id: ID; // [team, year, month, weekNumber, user]
	user: User;
	weekNumber: number;
	weekYear: number;
	pullRequestSummary?: PullRequestSummary;
	taskCycleSummaries?: TaskCycleSummary[];
	taskCycleAverageTime: number;
};

export type CycleTimeMetrics = {
	min: number;
	max: number;
	points: number;
};
