import { Handlers } from '$fresh/server.ts';
import { clearUserWeeklySummary } from '../../../controllers/user-weekly-summary.ts';
import fetchGithubPullRequests from '../../../jobs/fetch-github-pull-requests.ts';
import { Team } from '../../../types/common.ts';
export const handler: Handlers = {
	async PATCH(req, ctx) {
		const body = await req.json();

		const headers = new Headers();
		if (!body) {
			return new Response('Invalid body', {
				status: 400, // See Other
				headers,
			});
		}

		const metrics = body.metrics || ['task', 'pr', 'issues'];

		if (metrics.includes('pr')) {
			await fetchGithubPullRequests([ctx.params.team as Team]);
		}

		return new Response(JSON.stringify(true, null, 2), {
			status: 201, // See Other
			headers,
		});
	},

	async DELETE(_, ctx) {
		const headers = new Headers();

		await clearUserWeeklySummary(ctx.params.team as Team);

		return new Response(JSON.stringify(true, null, 2), {
			status: 201, // See Other
			headers,
		});
	},
};
