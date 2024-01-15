import JobModel from '../models/job.ts';
import { JobStatus, Team } from '../types/common.ts';
import fetchClickupTasks from './fetch-clickup-tasks.ts';
import fetchGithubPullRequests from './fetch-github-pull-requests.ts';
import fetchJiraTasks from './fetch-jira-tasks.ts';

export default async function updateSummaries() {
	const id = ['update-summaries'];
	console.time('update-summaries');
	const job = await JobModel.get(id);
	console.log('job', job);

	if (!job) return;

	if (job.status !== JobStatus.READY) return;

	console.time('github-process');
	await JobModel.insert({
		...job,
		status: JobStatus.PROCESSING,
		body: { api: ['github'] },
	});
	console.log('processing github job');
	await fetchGithubPullRequests([Team.NEXIUX, Team.OPEXA]);
	console.timeEnd('github-process');

	console.time('jira-process');
	await JobModel.insert({
		...job,
		status: JobStatus.PROCESSING,
		body: { api: ['github', 'jira'] },
	});
	console.log('processing jira job');
	await fetchJiraTasks([Team.NEXIUX]);
	console.timeEnd('jira-process');

	console.time('clickup-process');
	await JobModel.insert({
		...job,
		status: JobStatus.PROCESSING,
		body: { api: ['github', 'jira', 'clickup'] },
	});
	console.log('processing clickup job');
	await fetchClickupTasks([Team.OPEXA]);
	console.timeEnd('clickup-process');

	console.log('processing done');
	console.timeEnd('update-summaries');

	await JobModel.insert({
		...job,
		status: JobStatus.READY,
	});
}
