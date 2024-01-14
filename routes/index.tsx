import { Handlers } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import { Team } from '../types/common.ts';
import TeamListContainer from '../islands/team-list-container.tsx';

export const handler: Handlers = {
	GET(_, ctx) {
		const headers = new Headers();
		headers.set(
			'location',
			`/teams`,
		);
		return new Response(null, {
			status: 303, // See Other
			headers,
		});
	},
};
