import { Handlers } from '$fresh/server.ts';
import { clearUserWeeklySummary } from '../../../controllers/user-weekly-summary.ts';
import fetchClickupTasks from '../../../jobs/fetch-clickup-tasks.ts';
import fetchGithubPullRequests from '../../../jobs/fetch-github-pull-requests.ts';
import fetchJiraTasks from '../../../jobs/fetch-jira-tasks.ts';
import { Team } from '../../../types/common.ts';
export const handler: Handlers = {
	async PATCH(req, ctx) {
		const rawBody = await req.text();

		const headers = new Headers();

		let metrics = ['jira', 'github', 'clickup'];

		if (rawBody) {
			const body = JSON.parse(rawBody);

			metrics = body.metrics || metrics;
		}

		if (metrics.includes('github')) {
			await fetchGithubPullRequests([ctx.params.team as Team]);
		}

		if (metrics.includes('jira')) {
			await fetchJiraTasks([ctx.params.team as Team]);
		}

		if (metrics.includes('clickup')) {
			await fetchClickupTasks([ctx.params.team as Team]);
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
