import uniq from 'https://deno.land/x/ramda@v0.27.2/source/uniq.js';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import splitEvery from 'https://deno.land/x/ramda@v0.27.2/source/splitEvery.js';
import DefaultModel from '../libs/model.ts';
import { ID, Team } from '../types/common.ts';
import {
	JiraIssueType,
	JiraStatus,
	Task,
	TaskStatus,
	TaskType,
} from '../types/task.ts';

class Model extends DefaultModel<Task> {
	private _queue: Map<string, Task>;

	private _processedTaskCache: Set<string>;

	constructor() {
		super();
		this._queue = new Map();
		this._processedTaskCache = new Set();
	}

	getPrefix() {
		return 'task';
	}

	generateId(id: ID) {
		return [this.getPrefix(), ...id];
	}

	parseType(type: JiraIssueType) {
		if (type === JiraIssueType.EPIC) return TaskType.EPIC;
		if (type === JiraIssueType.STORY) return TaskType.STORY;
		if (type === JiraIssueType.TASK) return TaskType.TASK;
		if (type === JiraIssueType.BUG || type === JiraIssueType.HOTFIX) {
			return TaskType.BUG;
		}
		if (type === JiraIssueType.DEFECT) return TaskType.DEFECT;
		return TaskType.SUBTASK;
	}

	parseStatus(type: JiraStatus) {
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

	async hasProcessTask(params: {
		team: Team;
		key: string;
		status: TaskStatus;
	}) {
		if (
			!this._processedTaskCache.has(
				[params.team, params.key, params.status].join(':splitter:'),
			)
		) {
			let task = this._queue.get(params.key) || null;

			if (!task) {
				task = await this.get([params.key, params.status]);
			}
			return !!task?.status;
		}
		return true;
	}

	async enqueue(
		task:
			& Pick<Task, 'id' | 'key'>
			& Partial<
				Omit<Task, 'id' | 'key' | 'pullRequests'> & { pullRequest: ID }
			>,
	) {
		let input: Task = task as unknown as Task;
		const existingTask = this._queue.get(task.key);

		const pullRequests = existingTask?.pullRequests || [];

		if (task.pullRequest) {
			pullRequests.push(task.pullRequest);
		}

		const subTasks = existingTask?.subTasks || [];
		if (task.subTasks) {
			subTasks.push(
				...task.subTasks,
			);
		}

		input = {
			...(existingTask || {}),
			...input,
			subTasks,
			pullRequests,
		};

		this._queue.set(task.key, input);

		if (this._queue.size > 1000) {
			await this.flush();
		}
	}

	async flush() {
		if (this._queue.size === 0) return;

		const commitEntries = async (issueBatch: Task[]) => {
			let queue = this.kv.atomic();
			const ids = await Bluebird.map(
				issueBatch,
				async (issue: Task) => {
					const currentTask = await this.get(issue.id);

					if (issue.pullRequests.length) {
						issue = {
							...issue,
							pullRequests: uniq([
								...(currentTask?.pullRequests || []),
								issue.pullRequests,
							].map((id) => id.join(':splitter:'))).map(
								(id: string) => id.split(':splitter:'),
							),
						};
					}

					if (issue.subTasks.length) {
						issue = {
							...issue,
							subTasks: uniq([
								...(currentTask?.subTasks || []),
								issue.subTasks,
							].map((id) => id.join(':splitter:'))).map(
								(id: string) => id.split(':splitter:'),
							),
						};
					}

					queue = queue.set(
						this.generateId(issue.id),
						{
							...(currentTask || {}),
							...issue,
						},
					);

					return [...issue.id, issue.status].join(':splitter:');
				},
			);

			await queue.commit();
			ids.filter((id) => !!id).forEach((id) => {
				this._processedTaskCache.add(id as string);
			});
		};

		await Bluebird.mapSeries(
			splitEvery(50, Array.from(this._queue.values())),
			commitEntries,
		);

		this._queue = new Map();
	}
}

const TaskModel = new Model();

export default TaskModel;
