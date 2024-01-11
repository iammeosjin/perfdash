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

export async function upsertUserWeeklySummary(
	input: {
		team: Team;
		date: string;
		user: ID;
		pullRequestSummary?: PullRequestSummary;
		taskCycleSummary?: TaskCycleSummary[];
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

	await UserWeeklySummaryModel.insert({
		id,
		user: input.user,
		weekNumber: startOfWeek.weekNumber,
		weekYear: startOfWeek.weekYear,
		pullRequestSummary: pullRequestSummary,
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
		await CursorModel.list({ prefix: ['github'] }),
		async (cursor) => {
			await CursorModel.delete(cursor.id);
		},
	);
}
