import JobModel from '../models/job.ts';
import { JobStatus, Team } from '../types/common.ts';
import fetchGithubPullRequests from './fetch-github-pull-requests.ts';
import fetchJiraTasks from './fetch-jira-tasks.ts';

export default async function updateSummaries() {
	const id = ['update-summaries'];
	const job = await JobModel.get(id);
	console.log('job', job);

	if (!job) return;

	if (job.status !== JobStatus.READY) return;

	await JobModel.insert({
		...job,
		status: JobStatus.PROCESSING,
		body: { api: ['github'] },
	});

	console.log('processing github job');
	await fetchGithubPullRequests([Team.NEXIUX, Team.OPEXA]);
	await JobModel.insert({
		...job,
		status: JobStatus.PROCESSING,
		body: { api: ['github', 'jira'] },
	});

	console.log('processing jira job');
	await fetchJiraTasks([Team.NEXIUX]);
	await JobModel.insert({
		...job,
		status: JobStatus.READY,
	});
}
