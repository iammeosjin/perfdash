import { Handlers } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';

export const handler: Handlers = {
	GET() {
		const headers = new Headers();
		headers.set(
			'location',
			`/backend/nexiux/${DateTime.now().toFormat('yyyy/MM/dd')}`,
		);
		return new Response(null, {
			status: 303, // See Other
			headers,
		});
	},
};
