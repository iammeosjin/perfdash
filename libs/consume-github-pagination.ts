// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import { GithubAPI } from '../apis/github.ts';
import { GithubAPIRepository, PullRequest } from '../types/pull-request.ts';
import { getUserByGithubHandle } from '../controllers/user.ts';
import reduceAndMerge from '../libs/reduce-and-merge.ts';
import calculateCycleMetricsPoints from './calculate-cycle-time-metrics-points.ts';
import { ID, PullRequestSummary, Team } from '../types/common.ts';
import { SCORE_METRICS, TIMEZONE } from './constants.ts';
import TaskModel from '../models/task.ts';

type PullRequestPaginationResponse = {
	weeklySummary: Record<string, { user: ID } & PullRequestSummary>;
	lastCursor?: string;
};

type ConsumeGithubPaginationOptions = {
	team: Team;
	repository: GithubAPIRepository;
	mergedAt: string;
};

export async function consume(params: {
	weeklySummary: Record<string, { user: ID } & PullRequestSummary>;
	mergedAt: DateTime;
	createdAt: DateTime;
	pr: PullRequest;
	team: Team;
}) {
	const { weeklySummary, mergedAt, pr, createdAt, team } = params;
	const startOfWeek = mergedAt.startOf('week').setZone(TIMEZONE)
		.toISO() as string;

	const authorKey = [startOfWeek, pr.author].join(';');

	const author = await getUserByGithubHandle(pr.author);

	const pullRequestReviewTime = mergedAt.diff(createdAt, 'seconds').seconds;

	let pullRequestPoints = 0;

	if (author) {
		const metrics = author.level === 1
			? SCORE_METRICS.JUNIORS.PRLT
			: SCORE_METRICS.SENIORS.PRLT;
		pullRequestPoints = calculateCycleMetricsPoints(
			pullRequestReviewTime,
			metrics,
		);
	}

	weeklySummary[authorKey] = reduceAndMerge([
		{
			...weeklySummary[authorKey],
			user: author ? author.id : [],
		} || {
			user: author ? author.id : [],
			pullRequestCreated: 0,
			pullRequestReviewTime: 0,
			pullRequestReviewed: 0,
			pullRequestPoints: 0,
		},
		{
			pullRequestCreated: 1,
			pullRequestReviewTime,
			pullRequestPoints: pullRequestPoints,
		},
	]);

	await Bluebird.mapSeries(pr.reviewers, async (reviewerHandle) => {
		const reviewer = await getUserByGithubHandle(reviewerHandle);

		if (!reviewer) return;

		const reviewerKey = [startOfWeek, reviewerHandle].join(';');

		let pullRequestPoints = reviewer.level === 1
			? SCORE_METRICS.JUNIORS.PRR
			: SCORE_METRICS.SENIORS.PRR;

		if (pr.firstReviewer === reviewerHandle) {
			pullRequestPoints = reviewer.level === 1
				? SCORE_METRICS.JUNIORS.FPRR
				: SCORE_METRICS.SENIORS.FPRR;
		}

		weeklySummary[reviewerKey] = reduceAndMerge([
			{
				...weeklySummary[reviewerKey],
				user: reviewer ? reviewer.id : [],
			} || {
				user: reviewer ? reviewer.id : [],
				pullRequestCreated: 0,
				pullRequestReviewTime: 0,
				pullRequestReviewed: 0,
				pullRequestPoints: 0,
			},
			{
				pullRequestReviewed: 1,
				pullRequestPoints: pullRequestPoints,
			},
		]);
	});

	await Bluebird.map(pr.issues, async (issue) => {
		await TaskModel.enqueue({
			id: [team, issue],
			key: issue,
			pullRequest: [
				team,
				pr.permalink.split('/').pop() as string,
			],
		});
	});

	return weeklySummary;
}

export async function consumeGithubPaginationByDateTime(
	response: PullRequestPaginationResponse,
	options: ConsumeGithubPaginationOptions & {
		after?: string;
	},
) {
	const result = await GithubAPI.getPullRequests({
		...options.repository,
		after: options.after,
		first: 100,
	});

	const after = result.endCursor;

	if (!response.lastCursor) {
		response.lastCursor = result.startCursor;
	}

	let refetch = true;

	response.weeklySummary = await Bluebird.reduce(
		result.pullRequests.filter((pr) => pr.merged),
		(weeklySummary, pr) => {
			if (!refetch) return weeklySummary;

			const createdAt = DateTime.fromISO(pr.createdAt);
			const mergedAt = DateTime.fromISO(pr.updatedAt);

			if (
				mergedAt <=
					DateTime.fromISO(options.mergedAt) &&
				Math.abs(
						mergedAt.diff(
							DateTime.fromISO(options.mergedAt),
							'months',
						).months,
					) <= 1
			) {
				refetch = false;
				return weeklySummary;
			}

			return consume({
				weeklySummary,
				mergedAt,
				createdAt,
				pr,
				team: options.team,
			});
		},
		response.weeklySummary || {},
	);

	if (refetch) {
		refetch = result.hasNextPage;
	}

	if (refetch) {
		return consumeGithubPaginationByDateTime(response, {
			...options,
			after,
		});
	}

	return response;
}

export async function consumeGithubPaginationByCursor(
	response: PullRequestPaginationResponse,
	options: ConsumeGithubPaginationOptions & { before: string },
) {
	const result = await GithubAPI.getPullRequests({
		...options.repository,
		before: options.before,
		last: 100,
	});

	if (!response.lastCursor) {
		response.lastCursor = result.startCursor;
	}

	response.weeklySummary = await Bluebird.reduce(
		result.pullRequests.filter((pr) => pr.merged),
		(weeklySummary, pr) => {
			const createdAt = DateTime.fromISO(pr.createdAt);
			const mergedAt = DateTime.fromISO(pr.mergedAt);

			return consume({
				weeklySummary,
				mergedAt,
				createdAt,
				pr,
				team: options.team,
			});
		},
		response.weeklySummary || {},
	);

	if (result.hasNextPage && result.startCursor) {
		return consumeGithubPaginationByCursor(response, {
			...options,
			before: result.startCursor as string,
		});
	}

	return response;
}
