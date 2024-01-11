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

export enum TaskType {
	EPIC = 'EPIC',
	BUG = 'BUG',
	SUBTASK = 'SUBTASK',
	STORY = 'STORY',
	DEFECT = 'DEFECT',
}

export type Task =
	& {
		id: ID; // [team, issueKey]
		key: string;
		type: TaskType;
		status: string;
		pullRequests: ID[];
		hasSubTasks: boolean;
		subTasks: ID[];
	}
	& Partial<{
		dateTimeMovedToInprogress: string;
		cycleTime: number;
		assignee: ID;
		parent: ID;
		parentType: TaskType;
		parentStatus: string;
		assigneeName: string;
		dateTimeCreated: string;
	}>;
