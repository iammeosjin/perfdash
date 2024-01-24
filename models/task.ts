import uniq from 'https://deno.land/x/ramda@v0.27.2/source/uniq.js';
import ms from 'npm:ms';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import splitEvery from 'https://deno.land/x/ramda@v0.27.2/source/splitEvery.js';
import DefaultModel from '../libs/model.ts';
import { ID, Team } from '../types/common.ts';
import { Task, TaskStatus } from '../types/task.ts';
import { TIMEZONE } from '../libs/constants.ts';

class Model extends DefaultModel<Task> {
	private _queue: Map<string, Task>;

	private _processedTaskCache: Set<string>;

	private _lastProcessedDate: string | undefined;

	constructor() {
		super();
		this._queue = new Map();
		this._processedTaskCache = new Set();
	}

	set lastProcessedDate(date: string) {
		this._lastProcessedDate = date;
	}

	clearCache() {
		this._lastProcessedDate = undefined;
		this._processedTaskCache.clear();
	}

	clearProcessedTaskCache(cursor: string) {
		if (!this._lastProcessedDate) return false;

		if (
			DateTime.fromISO(cursor).setZone(TIMEZONE)
				.startOf('day').valueOf() <=
				DateTime.fromISO(this._lastProcessedDate).setZone(TIMEZONE)
					.startOf(
						'day',
					).valueOf()
		) return false;

		this._processedTaskCache.clear();
		return true;
	}

	getPrefix() {
		return 'task';
	}

	generateId(id: ID) {
		return [this.getPrefix(), ...id];
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
				task = await this.get([params.team, params.key]);
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
						{ expireIn: ms('30d') },
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
