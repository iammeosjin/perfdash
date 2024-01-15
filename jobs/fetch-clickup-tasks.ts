// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import { ID, TaskCycleSummary, Team } from '../types/common.ts';
import { TIMEZONE } from '../libs/constants.ts';
import CursorModel from '../models/cursor.ts';
import { upsertUserWeeklySummary } from '../controllers/user-weekly-summary.ts';
import consumeClickupPagination from '../libs/consume-clickup-pagination.ts';

export default async function fetchClickupTasks(teams: Team[]) {
	const defaultCursor = DateTime.now().setZone(TIMEZONE).minus({ days: 5 })
		.startOf('week') //DateTime.now().setZone(TIMEZONE).startOf('month')
		.toISO() as string;
	await Bluebird.mapSeries(teams, async (team) => {
		if (team !== Team.OPEXA) return null;

		const cursorKey = ['clickup', team];
		const cursor = await CursorModel.get(cursorKey);
		const lastCursor = new Date().toISOString();

		if (!cursor?.cursor) {
			await CursorModel.insert({
				id: cursorKey,
				cursor: lastCursor,
			});
		}

		const response = await consumeClickupPagination({ weeklySummary: {} }, {
			dateStarted: cursor?.cursor || defaultCursor,
			dateEnded: lastCursor,
			team: team,
		});

		await CursorModel.insert({
			id: cursorKey,
			cursor: lastCursor,
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
