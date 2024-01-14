import { Handlers } from '$fresh/server.ts';
import JobModel from '../../../models/job.ts';

export const handler: Handlers = {
	async GET(_, ctx) {
		const id = [ctx.params.job];
		const job = await JobModel.get(id);

		if (!job) {
			return new Response('Not Found', {
				status: 404,
			});
		}

		const headers = new Headers();
		headers.set(
			'Cache-Control',
			'max-age=0, no-cache, must-revalidate, proxy-revalidate',
		);

		return new Response(
			JSON.stringify(
				{
					status: job.status,
					body: job.body,
				},
				null,
				2,
			),
			{
				status: 200, // See Other
				headers,
			},
		);
	},
	async PUT(req, ctx) {
		const body = await req.json();
		const id = [ctx.params.job];
		const job = await JobModel.get(id);

		if (!job) {
			return new Response('Not Found', {
				status: 404,
			});
		}

		await JobModel.insert({
			...job,
			...body,
			id,
		});

		const headers = new Headers();
		headers.set(
			'Cache-Control',
			'max-age=0, no-cache, must-revalidate, proxy-revalidate',
		);

		return new Response('OK', {
			status: 200, // See Other
			headers,
		});
	},
};
