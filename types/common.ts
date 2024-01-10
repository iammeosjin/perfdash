enum Team {
  OPEXA = 'OPEXA',
  NEXIUX = 'NEXIUX',
}

export type User =
	& {
		id: string;
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
    taskCyclePoints: number
  };

  export type UserWeeklySummary = {
    user: string;
    weekNumber: number;
    weekYear: number;
    pullRequestSummary: PullRequestSummary;
    taskCycleSummary: TaskCycleSummary[];
  };