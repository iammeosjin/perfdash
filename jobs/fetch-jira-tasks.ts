// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import { ID, TaskCycleSummary, Team } from '../types/common.ts';
import { TIMEZONE } from '../libs/constants.ts';
import CursorModel from '../models/cursor.ts';
import TaskModel from '../models/task.ts';
import { upsertUserWeeklySummary } from '../controllers/user-weekly-summary.ts';
import consumeJiraPagination from '../libs/consume-jira-pagination.ts';

export default async function fetchJiraTasks(teams: Team[]) {
	const defaultCursor = DateTime.now().setZone(TIMEZONE).startOf('month')
		.toISO() as string;
	await Bluebird.mapSeries(teams, async (team) => {
		if (team !== Team.NEXIUX) return null;

		const cursorKey = ['jira', team];
		const cursor = await CursorModel.get(cursorKey);
		if (!cursor) {
			await CursorModel.insert({
				id: cursorKey,
				cursor: defaultCursor,
			});
		}

		const response = await consumeJiraPagination({ weeklySummary: {} }, {
			cursor: cursor?.cursor || defaultCursor,
			team: team,
		});

		await TaskModel.flush();

		await CursorModel.insert({
			id: cursorKey,
			cursor: new Date().toISOString(),
		});

		await Bluebird.mapSeries(
			toPairs(response.weeklySummary),
			async (
				[key, weeklySummary]: [
					string,
					{ user: ID } & TaskCycleSummary,
				],
			) => {
				const [startOfWeek] = key.split(';');

				if (weeklySummary.user.length === 0) return;
				await upsertUserWeeklySummary({
					team,
					date: startOfWeek,
					user: weeklySummary.user,
					taskCycleSummary: omit(['user'])(weeklySummary),
				});
			},
		);
	});
}
