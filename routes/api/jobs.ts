import { Handlers } from '$fresh/server.ts';
import updateSummaries from '../../jobs/update-summaries.ts';
import JobModel from '../../models/job.ts';

export const handler: Handlers = {
	async GET() {
		const headers = new Headers();
		headers.set(
			'Cache-Control',
			'max-age=0, no-cache, must-revalidate, proxy-revalidate',
		);

		return new Response(
			JSON.stringify(
				await JobModel.list(),
				null,
				2,
			),
			{
				status: 200, // See Other
				headers,
			},
		);
	},
	async POST(req) {
		const body = await req.json();

		await JobModel.insert(body);

		const headers = new Headers();
		headers.set(
			'Cache-Control',
			'max-age=0, no-cache, must-revalidate, proxy-revalidate',
		);

		updateSummaries();

		return new Response('OK', {
			status: 200, // See Other
			headers,
		});
	},
};
