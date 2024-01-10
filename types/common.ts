enum Team {
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

export type TaskCycleSummary = {
	type: string;
	taskDoneCount: number;
	taskDoneCycleTime: number;
	taskCyclePoints: number;
};

export type UserWeeklySummary = {
	id: ID;
	user: string;
	weekNumber: number;
	weekYear: number;
	pullRequestSummary: PullRequestSummary;
	taskCycleSummary: TaskCycleSummary[];
};
