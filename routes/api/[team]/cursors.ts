import { Handlers } from '$fresh/server.ts';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import CursorModel from '../../../models/cursor.ts';
export const handler: Handlers = {
	async PATCH(req, ctx) {
		const rawBody = await req.text();

		const headers = new Headers();

		headers.set('Content-Type', 'application/json');

		await Bluebird.map(
			toPairs(rawBody),
			async ([key, value]: [string, string]) => {
				await CursorModel.insert({
					id: [key, ctx.params.team],
					cursor: value,
				});
			},
		);

		return new Response(JSON.stringify(true, null, 2), {
			status: 201, // See Other
			headers,
		});
	},
};
