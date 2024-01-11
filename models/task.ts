import uniq from 'https://deno.land/x/ramda@v0.27.2/source/uniq.js';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import splitEvery from 'https://deno.land/x/ramda@v0.27.2/source/splitEvery.js';
import DefaultModel from '../libs/model.ts';
import { ID } from '../types/common.ts';
import { Task } from '../types/task.ts';

type QueueEntryValue = Omit<Task, 'pullRequests'> & { pullRequest: ID };

class Model extends DefaultModel<Task> {
	private _queue: Map<string, Task>;

	constructor() {
		super();
		this._queue = new Map();
	}

	getPrefix() {
		return 'task';
	}

	generateId(id: ID) {
		return [this.getPrefix(), ...id];
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

		input = {
			...(existingTask || {}),
			...input,
			pullRequests,
		};

		this._queue.set(task.key, input);

		if (this._queue.size > 100) {
			await this.flush();
		}
	}

	async flush() {
		if (this._queue.size === 0) return;

		const commitEntries = async (issueBatch: Task[]) => {
			let queue = this.kv.atomic();
			await Bluebird.map(
				issueBatch,
				async (issue: Task) => {
					const currentTask = await this.get(issue.id);

					let pullRequests = currentTask?.pullRequests || [];
					if (issue.pullRequests.length) {
						pullRequests = uniq([
							...pullRequests,
							issue.pullRequests,
						].map((id) => id.join(':splitter:'))).map(
							(id: string) => id.split(':splitter:'),
						);
						issue = {
							...issue,
							pullRequests,
						};
					}
					queue = queue.set(
						this.generateId(issue.id),
						{
							...(currentTask || {}),
							...issue,
						},
					);
				},
			);

			await queue.commit();
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
