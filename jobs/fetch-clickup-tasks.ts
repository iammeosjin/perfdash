// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import isEmpty from 'https://deno.land/x/ramda@v0.27.2/source/isEmpty.js';
import { ID, TaskCycleSummary, Team } from '../types/common.ts';
import { TIMEZONE } from '../libs/constants.ts';
import CursorModel from '../models/cursor.ts';
import { upsertUserWeeklySummary } from '../controllers/user-weekly-summary.ts';
import consumeClickupPagination from '../libs/consume-clickup-pagination.ts';
import TaskModel from '../models/task.ts';

export default async function fetchClickupTasks(
	teams: Team[],
	startOfWeek?: DateTime,
) {
	const defaultCursor = DateTime.now().setZone(TIMEZONE).startOf('month')
		.toISO() as string;
	await Bluebird.mapSeries(teams, async (team) => {
		if (team !== Team.OPEXA) return null;

		const cursorKey = ['clickup', team];
		const cursor = await CursorModel.get(cursorKey);
		const lastCursor = DateTime.now().setZone(TIMEZONE).toISO() as string;
		const dateStarted = startOfWeek?.toISO() || cursor?.cursor ||
			defaultCursor;

		const dateEnded = startOfWeek
			? startOfWeek.endOf('week').toISO()
			: lastCursor;

		if (!startOfWeek) {
			TaskModel.clearProcessedTaskCache(lastCursor);
		}
		const response = await consumeClickupPagination({ weeklySummary: {} }, {
			dateStarted,
			dateEnded: dateEnded as string,
			team: team,
		});

		await TaskModel.flush();

		TaskModel.lastProcessedDate = lastCursor;

		await Bluebird.mapSeries(
			toPairs(response.weeklySummary),
			async (
				[key, weeklySummary]: [
					string,
					{ user: ID; tasksCreated: string[] } & TaskCycleSummary,
				],
			) => {
				const [startOfWeek] = key.split(';');

				if (weeklySummary.user.length === 0) return;
				const input = omit(['user', 'tasksCreated'])(weeklySummary);
				if (
					isEmpty(weeklySummary?.tasksCreated || []) && isEmpty(input)
				) return;
				await upsertUserWeeklySummary({
					team,
					date: startOfWeek,
					user: weeklySummary.user,
					taskCycleSummary: input,
					tasksCreated: weeklySummary.tasksCreated,
				});
			},
		);

		if (!startOfWeek) {
			await CursorModel.insert({
				id: cursorKey,
				cursor: lastCursor,
			});
		}
	});
}
