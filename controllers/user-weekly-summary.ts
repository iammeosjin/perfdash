// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import reduceAndMerge from '../libs/reduce-and-merge.ts';
import UserWeeklySummaryModel from '../models/user-weekly-summary.ts';
import {
	ID,
	PullRequestSummary,
	TaskCycleSummary,
	Team,
} from '../types/common.ts';
import { TIMEZONE } from '../libs/constants.ts';
import CursorModel from '../models/cursor.ts';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import TaskModel from '../models/task.ts';
import uniq from 'https://deno.land/x/ramda@v0.27.2/source/uniq.js';

export async function upsertUserWeeklySummary(
	input: {
		team: Team;
		date: string;
		user: ID;
		pullRequestSummary?: PullRequestSummary;
		taskCycleSummary?: TaskCycleSummary;
		tasksCreated?: string[];
	},
) {
	const startOfWeek = DateTime.fromISO(input.date).setZone(TIMEZONE).startOf(
		'week',
	);

	const id = UserWeeklySummaryModel.generateId({
		team: input.team,
		year: startOfWeek.year,
		month: startOfWeek.month,
		weekNumber: startOfWeek.weekNumber,
		user: input.user,
	});

	const userWeeklySummary = await UserWeeklySummaryModel.get(id);

	let pullRequestSummary: PullRequestSummary | undefined = userWeeklySummary
		?.pullRequestSummary;

	if (input.pullRequestSummary) {
		pullRequestSummary = reduceAndMerge([
			pullRequestSummary || {},
			input.pullRequestSummary,
		]);
	}

	let taskCycleSummaries: TaskCycleSummary[] | undefined = userWeeklySummary
		?.taskCycleSummaries;

	if (input.taskCycleSummary) {
		const existingTaskCycleSummary = (taskCycleSummaries ||= []).find((
			tsc,
		) => tsc.type === input.taskCycleSummary?.type);

		if (existingTaskCycleSummary) {
			Object.assign(
				existingTaskCycleSummary,
				reduceAndMerge([
					existingTaskCycleSummary,
					omit(['type'])(input.taskCycleSummary),
				]),
			);
		} else {
			taskCycleSummaries = [
				...(taskCycleSummaries || []),
				input.taskCycleSummary,
			];
		}
	}

	let tasksCreated: string[] | undefined = userWeeklySummary
		?.tasksCreated;

	if (input.tasksCreated) {
		tasksCreated = uniq([
			...(tasksCreated || []),
			...input.tasksCreated,
		]);
	}

	await UserWeeklySummaryModel.insert({
		id,
		user: input.user,
		weekNumber: startOfWeek.weekNumber,
		weekYear: startOfWeek.weekYear,
		pullRequestSummary: pullRequestSummary,
		taskCycleSummaries,
		tasksCreated,
	});
}

export async function clearUserWeeklySummary(team: Team) {
	await Bluebird.map(
		await UserWeeklySummaryModel.list({ prefix: [team] }),
		async (uws) => {
			await UserWeeklySummaryModel.delete(uws.id);
		},
	);

	await Bluebird.map(
		await TaskModel.list({ prefix: [team] }),
		async (uws) => {
			await TaskModel.delete(uws.id);
		},
	);

	await CursorModel.delete(['github', team]);
	await CursorModel.delete(['clickup', team]);
	await CursorModel.delete(['jira', team]);
}
