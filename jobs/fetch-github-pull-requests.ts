// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import { ID, PullRequestSummary, Team } from '../types/common.ts';
import { GITHUB_REPOSITORIES, TIMEZONE } from '../libs/constants.ts';
import CursorModel from '../models/cursor.ts';

import TaskModel from '../models/task.ts';
import { upsertUserWeeklySummary } from '../controllers/user-weekly-summary.ts';
import {
	consumeGithubPaginationByCursor,
	consumeGithubPaginationByDateTime,
} from '../libs/consume-github-pagination.ts';

export default function fetchGithubPullRequests(
	teams: Team[],
) {
	const mergedAt = DateTime.now().setZone(TIMEZONE).startOf('month')
		.toISO() as string;
	return Bluebird.mapSeries(teams, async (team) => {
		const cursorKey = ['github', team];

		const cursor = await CursorModel.get(cursorKey);

		const credentials = GITHUB_REPOSITORIES[team];

		const response = await (
			cursor?.cursor
				? consumeGithubPaginationByCursor({
					weeklySummary: {},
				}, {
					team,
					repository: credentials,
					mergedAt,
					before: cursor?.cursor,
				})
				: consumeGithubPaginationByDateTime({
					weeklySummary: {},
				}, {
					team,
					repository: credentials,
					mergedAt,
				})
		);

		await TaskModel.flush();

		await Bluebird.map(
			toPairs(response.weeklySummary),
			async (
				[key, weeklySummary]: [
					string,
					{ user: ID } & PullRequestSummary,
				],
			) => {
				if (weeklySummary.user.length === 0) return;
				const [startOfWeek] = key.split(';');

				await upsertUserWeeklySummary({
					team,
					date: startOfWeek,
					user: weeklySummary.user,
					pullRequestSummary: omit(['user'])(weeklySummary),
				});
			},
		);

		await CursorModel.insert({
			id: cursorKey,
			cursor: response.lastCursor || cursor?.cursor,
		});
	});
}
