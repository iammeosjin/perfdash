// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import { Handlers } from '$fresh/server.ts';
import fetchClickupTasks from '../../../../jobs/fetch-clickup-tasks.ts';
import { Team } from '../../../../types/common.ts';
import { TIMEZONE } from '../../../../libs/constants.ts';

export const handler: Handlers = {
	PATCH(_, ctx) {
		const dateTime = DateTime.fromObject({
			weekYear: DateTime.now().weekYear,
			weekNumber: parseInt(ctx.params.week as string),
		}).setZone(TIMEZONE);

		const headers = new Headers();

		fetchClickupTasks(
			[ctx.params.team as Team],
			dateTime.startOf('week'),
		);

		return new Response(JSON.stringify(true, null, 2), {
			status: 201, // See Other
			headers,
		});
	},
};
