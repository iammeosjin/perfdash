// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import pick from 'https://deno.land/x/ramda@v0.27.2/source/pick.js';
import jiraClient from '../libs/jira-client.ts';
import { TIMEZONE } from '../libs/constants.ts';
import {
	JiraChangeLogResponse,
	JiraIssueFieldsResponse,
	JiraIssueType,
	JiraRequestOptions,
	JiraStatus,
	JiraTask,
	TaskStatus,
	TaskType,
} from '../types/task.ts';

const issueTypes = {
	'10000': 'EPIC',
	'10001': 'STORY',
	'10002': 'TASK',
	'10003': 'SUBTASK',
	'10004': 'BUG',
	'10260': 'TASK',
	'10261': 'EPIC',
	'10263': 'BUG',
	'10264': 'STORY',
	'10266': 'SUBTASK',
	'10282': 'DEFECT',
	'10315': 'DEFECT',
	'10355': 'BASIC_TASK',
} as Record<string, JiraIssueType>;

export class JiraAPI {
	static parseType(type: JiraIssueType): TaskType {
		if (type === JiraIssueType.EPIC) return TaskType.EPIC;
		if (type === JiraIssueType.STORY) return TaskType.STORY;
		if (type === JiraIssueType.TASK) return TaskType.TASK;
		if (type === JiraIssueType.BUG || type === JiraIssueType.HOTFIX) {
			return TaskType.BUG;
		}
		if (type === JiraIssueType.DEFECT) return TaskType.DEFECT;
		return TaskType.SUBTASK;
	}

	static parseStatus(type: JiraStatus): TaskStatus {
		if (
			[JiraStatus.UAT_FAILED_PRODUCTION, JiraStatus.UAT_FAILED_STAGING]
				.includes(type)
		) return TaskStatus.UAT_FAILED;
		if (
			[
				JiraStatus.UAT_PRODUCTION,
				JiraStatus.UAT_STAGING,
				JiraStatus.READY_FOR_RELEASE,
			]
				.includes(type)
		) return TaskStatus.UAT;

		if (type === JiraStatus.DONE) return TaskStatus.DONE;

		if (type === JiraStatus.IN_PROGRESS) return TaskStatus.IN_PROGRESS;

		if (type === JiraStatus.READY) return TaskStatus.READY;

		return TaskStatus.BACKLOG;
	}

	static async getIssues(
		filter?: Partial<{ type: string; cursor: string }>,
		options?: Partial<JiraRequestOptions>,
	): Promise<
		JiraRequestOptions & {
			issues: JiraTask[];
		}
	> {
		const cursor =
			(filter?.cursor ? DateTime.fromISO(filter.cursor) : DateTime.now())
				.setZone(TIMEZONE);
		const query = [
			'project = "ROW"',
			filter?.type ||
			'type in (Bug, Story, Task,  Defect, subTaskIssueTypes())',
			`(created >= "${cursor.toFormat('yyyy-MM-dd')}" OR resolved >= "${
				cursor.toFormat('yyyy-MM-dd')
			}")`,
		].filter((index) => !!index).join(' AND ');

		const jql =
			`${query} ORDER BY created DESC, resolved DESC, status DESC, updated DESC`;

		console.log(jql);

		const result = await jiraClient.searchJira(
			jql,
			{
				maxResults: options?.maxResults || 10000,
				startAt: options?.startAt,
				expand: ['changelog'],
				fields: [
					'parent',
					'issuetype',
					'assignee',
					'reporter',
					'statuscategorychangedate',
					'created',
					'updated',
					'status',
					'subtasks',
				],
			},
		) as JiraRequestOptions & {
			issues: {
				key: string;
				changelog: JiraChangeLogResponse;
				fields: JiraIssueFieldsResponse;
			}[];
		};

		const issues: JiraTask[] = result.issues
			.map((issue) => {
				let parent: JiraTask['parent'] | undefined;
				const parentId = issue.fields.parent?.fields.issuetype.id;
				if (parentId) {
					parent = {
						key: issue.fields.parent?.key as string,
						status: issue.fields.parent?.fields.status
							.name as JiraStatus,
						type: issueTypes[parentId],
					};
				}
				const movedToInProgress = issue.changelog.histories.find(
					(history) =>
						history.items.some((item) =>
							item.field === 'status' &&
							item.toString === 'In Progress'
						),
				)?.created as string;

				const subTasks = (issue.fields?.subtasks || []).map((task) => {
					return {
						key: task.key,
						status: task.fields?.status?.name as JiraStatus,
						type: issueTypes[task.fields?.issuetype?.id],
					};
				});
				return {
					summary: issue.fields.summary,
					key: issue.key,
					assignee: issue.fields?.assignee
						? {
							id: issue.fields?.assignee?.accountId,
							name: issue.fields?.assignee?.displayName,
						}
						: undefined,
					reporter: {
						id: issue.fields?.reporter?.accountId,
						name: issue.fields?.reporter?.displayName,
					},
					parent,
					hasSubtask: subTasks.length > 0,
					subTasks,
					type: issueTypes[
						issue.fields?.issuetype?.id
					],
					created: issue.fields?.created,
					updated: issue.fields?.updated,
					statusCategoryChangeDate: issue.fields
						?.statuscategorychangedate,
					movedToInProgress: movedToInProgress,
					status: issue.fields?.status?.name as JiraStatus,
				};
			});

		return {
			...pick(['startAt', 'maxResults', 'total'])(result),
			issues,
		};
	}
}
