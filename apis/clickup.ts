// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import { TIMEZONE } from '../libs/constants.ts';
import {
	ClickupRequestOption,
	ClickupStatus,
	ClickupTask,
	ClickupTaskCustomField,
	ClickupTasksResponse,
	ClickupTaskType,
	TaskStatus,
	TaskType,
} from '../types/task.ts';

export class ClickupAPI {
	static parseType(type: ClickupTaskType) {
		if (type === ClickupTaskType.EPIC) return TaskType.EPIC;
		if (
			type === ClickupTaskType.STORY || type === ClickupTaskType.SUPERTASK
		) return TaskType.STORY;
		if (type === ClickupTaskType.TASK) return TaskType.TASK;
		if (type === ClickupTaskType.BUG) {
			return TaskType.BUG;
		}
		if (type === ClickupTaskType.SUPPORT) {
			return TaskType.SUPPORT;
		}
		if (type === ClickupTaskType.DEFECT) return TaskType.DEFECT;
		return TaskType.SUBTASK;
	}

	static parseStatus(type: ClickupStatus) {
		if (type === ClickupStatus.DONE || type === ClickupStatus.CLOSED) {
			return TaskStatus.DONE;
		}

		if (type === ClickupStatus.IN_PROGRESS) return TaskStatus.IN_PROGRESS;

		if (type === ClickupStatus.READY) return TaskStatus.READY;

		return TaskStatus.BACKLOG;
	}
	static async getTasks(
		filter?: Partial<{ startDate: string; endDate: string }>,
		options?: Partial<ClickupRequestOption>,
	): Promise<
		ClickupRequestOption & {
			tasks: ClickupTask[];
			hasNextPage: boolean;
		}
	> {
		const startDate =
			(filter?.startDate
				? DateTime.fromISO(filter.startDate)
				: DateTime.now().minus({ minutes: 1 }))
				.setZone(TIMEZONE);

		const endDate =
			(filter?.endDate
				? DateTime.fromISO(filter.endDate)
				: DateTime.now())
				.setZone(TIMEZONE);

		console.log(filter);
		const query = [
			`page=${options?.page || 0}`,
			`archive=false`,
			`include_markdown_description=false`,
			'subtasks=true',
			'include_closed=true',
			`date_updated_gt=${startDate.valueOf()}`,
			`date_updated_lt=${endDate.valueOf()}`,
		].filter((index) => !!index).join('&');

		const result: {
			tasks: ClickupTasksResponse[];
			last_page: boolean;
		} = await fetch(
			`https://api.clickup.com/api/v2/list/900801511891/task?${query}`,
			{
				headers: {
					'Authorization': Deno.env.get('CLICKUP_TOKEN') as string,
					'Content-Type': 'application/json',
				},
			},
		).then((result) => result.json());
		const tasks: ClickupTask[] = result.tasks
			.map((task) => {
				const typeField = task.custom_fields.find((field) =>
					field.name === 'Type'
				) as ClickupTaskCustomField;

				const type = typeField.type_config.options.find((option) =>
					option.orderindex === typeField.value
				)?.name as ClickupTaskType;

				const assignee = task.assignees[0];
				return {
					key: task.id,
					url: task.url,
					summary: task.name,
					assignee: assignee
						? {
							id: assignee?.id?.toString() as string,
							name: assignee?.username as string,
						}
						: undefined,
					creator: {
						id: task.creator.id.toString(),
						name: task.creator.username,
					},
					type,
					dateCreated: task.date_created,
					dateUpdated: task.date_updated,
					dateDone: task.date_done || task.date_closed,
					status: task.status.status,
					parent: task.parent,
				};
			});

		return {
			tasks,
			hasNextPage: !result.last_page,
			page: options?.page || 0,
		};
	}

	static async getTasksTimeInStatus(
		filter: { taskIds: string[] },
	): Promise<
		Record<string, { cycleTime: number; since: number }>
	> {
		const query = filter.taskIds.map((taskId) => `task_ids=${taskId}`).join(
			'&',
		);
		const result: Record<
			string,
			{
				status_history: [{
					status: ClickupStatus;
					total_time: {
						by_minute: number;
						since: number;
					};
				}];
			}
		> = await fetch(
			`https://api.clickup.com/api/v2/task/bulk_time_in_status/task_ids?${query}`,
			{
				headers: {
					'Authorization': Deno.env.get('CLICKUP_TOKEN') as string,
				},
			},
		).then((result) => result.json());
		const taskCycleTime = filter.taskIds
			.reduce((accum, task) => {
				const inProgress = result[task].status_history.find((history) =>
					history.status === ClickupStatus.IN_PROGRESS
				);
				if (inProgress) {
					accum[task] = {
						cycleTime: inProgress.total_time.by_minute ||
							0,
						since: inProgress.total_time.since,
					};
				}

				return accum;
			}, {} as Record<string, { cycleTime: number; since: number }>);

		return taskCycleTime;
	}
}
