import { ID } from './common.ts';

export enum JiraIssueType {
	EPIC = 'EPIC',
	BUG = 'BUG',
	TASK = 'TASK',
	SUBTASK = 'SUBTASK',
	STORY = 'STORY',
	HOTFIX = 'HOTFIX',
	DEFECT = 'DEFECT',
	BASIC_TASK = 'BASIC_TASK',
}

export enum JiraStatus {
	BACKLOG = 'Backlog',
	READY = 'Ready',
	IN_PROGRESS = 'In Progress',
	DONE = 'Done',
	UAT_FAILED_PRODUCTION = 'UAT Failed (Production)',
	UAT_FAILED_STAGING = 'UAT Failed (Staging)',
	UAT_PRODUCTION = 'UAT (Production)',
	UAT_STAGING = 'UAT (Staging)',
	READY_FOR_RELEASE = 'Ready for Release',
}

export type JiraTask = {
	key: string;
	summary: string;
	assignee?: {
		id: string;
		name: string;
	};
	reporter: {
		id: string;
		name: string;
	};
	hasSubtask: boolean;
	type: JiraIssueType;
	created: string;
	updated: string;
	statusCategoryChangeDate: string;
	movedToInProgress: string;
	status: JiraStatus;
	parent?: Pick<JiraTask, 'key' | 'type' | 'status'>;
	subTasks: Pick<JiraTask, 'key' | 'type' | 'status'>[];
};

export type JiraIssueFieldsResponse = {
	issuetype: { id: string };
	summary: string;
	status: { name: string };
	subtasks?: { key: string; fields: JiraIssueFieldsResponse }[];
	parent?: { key: string; fields: JiraIssueFieldsResponse };
	assignee: { accountId: string; displayName: string };
	reporter: { accountId: string; displayName: string };
	statuscategorychangedate: string;
	updated: string;
	created: string;
};

export type JiraChangeLogResponse = {
	histories: {
		created: string;
		items: [
			{ field: string; fromString: string; toString: string },
		];
	}[];
};

export enum ClickupTaskType {
	MILESTONE = 'Milestone',
	EPIC = 'Epic',
	BUG = 'Bug',
	TASK = 'Task',
	STORY = 'Story',
	DEFECT = 'Defect',
	SUPERTASK = 'Supertask',
	SUPPORT = 'Support',
}

export enum ClickupStatus {
	TO_DO = 'to do',
	READY = 'ready',
	IN_PROGRESS = 'in progress',
	DONE = 'done',
	CLOSED = 'Closed',
}

export type ClickupTask = {
	key: string;
	summary: string;
	assignee?: {
		id: string;
		name: string;
	};
	creator: {
		id: string;
		name: string;
	};
	type: ClickupTaskType;
	dateCreated: string;
	dateUpdated: string;
	dateDone?: string;
	status: ClickupStatus;
	parent?: string;
	url: string;
};

export type ClickupTaskCustomField = {
	id: string;
	name: string;
	type_config: {
		options: [{
			name: string;
			orderindex: number;
		}];
	};
	value: number;
};

export type ClickupTasksResponse = {
	id: string;
	name: string;
	custom_id: string;
	status: {
		status: ClickupStatus;
	};
	date_updated: string;
	date_created: string;
	date_closed?: string;
	date_done?: string;
	creator: {
		id: number;
		username: string;
	};
	assignees: { id: number; username: string }[];
	parent?: string;
	custom_fields: ClickupTaskCustomField[];
	url: string;
};

export type ClickupRequestOption = {
	page: number;
};

export type JiraRequestOptions = {
	startAt: number;
	maxResults: number;
	total: number;
};

export enum TaskType {
	EPIC = 'EPIC',
	BUG = 'BUG',
	TASK = 'TASK',
	SUBTASK = 'SUB_TASK',
	STORY = 'STORY',
	DEFECT = 'DEFECT',
	SUPPORT = 'SUPPORT',
}

export enum TaskStatus {
	BACKLOG = 'BACKLOG',
	READY = 'READY',
	UAT = 'UAT',
	UAT_FAILED = 'UAT_FAILED',
	DONE = 'DONE',
	IN_PROGRESS = 'IN_PROGRESS',
}

export type Task =
	& {
		id: ID; // [team, issueKey]
		key: string;
		summary: string;
		link: string;
		type: TaskType;
		status: TaskStatus;
		pullRequests: ID[];
		subTasks: ID[];
		reporter: {
			id: string;
			name: string;
		};
		dateTimeCreated: string;
	}
	& Partial<{
		hasSubTasks: boolean;
		dateTimeMovedToInprogress: string;
		dateTimeMovedToDone: string;
		cycleTime: number;
		assignee: {
			id: string;
			name: string;
		};
		parent: {
			key: string;
			type?: TaskType;
			status?: TaskStatus;
		};
	}>;
