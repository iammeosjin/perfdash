import { Handlers } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import equals from 'https://deno.land/x/ramda@v0.27.2/source/equals.js';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import fromPairs from 'https://deno.land/x/ramda@v0.27.2/source/fromPairs.js';
import {
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
	User,
	UserWeeklySummary,
	WeeklySummary,
} from '../../../../../types/common.ts';
import UserModel from '../../../../../models/user.ts';
import { TIMEZONE } from '../../../../../libs/constants.ts';
import UserWeeklySummaryModel from '../../../../../models/user-weekly-summary.ts';
import { WeeklySummaryPullRequesTableFooter } from '../../../../../types/ui.ts';
import WeeklyPullRequestSummaryTable from '../../../../../islands/weekly-pull-request-summary-table.tsx';
import reduceAndMerge from '../../../../../libs/reduce-and-merge.ts';
import WeeklyTaskSummaryTable from '../../../../../islands/weekly-task-summary-table.tsx';

type PageProps = {
	userWeeklySummaries: UserWeeklySummary[];
	weekDateRange: string;
	footer: WeeklySummaryPullRequesTableFooter;
};

export const handler: Handlers = {
	async GET(_, ctx) {
		let users: User[] = await UserModel.list();

		const team = ctx.params.team as Team;

		users = users.filter((user) => (user.teams || []).includes(team));

		const date = DateTime.fromObject({
			year: +ctx.params.year,
			month: +ctx.params.month,
			day: +ctx.params.day,
		}).setZone(TIMEZONE);

		if (!date.toISO()) {
			const headers = new Headers();
			headers.set(
				'location',
				`/backend/${team}/${DateTime.now().toFormat('yyyy/MM/dd')}`,
			);
			return new Response(null, {
				status: 303, // See Other
				headers,
			});
		}

		const weeklySummaries = await UserWeeklySummaryModel.list({
			prefix: [
				team,
				date.year.toString(),
				date.month.toString(),
				date.weekNumber.toString(),
			],
		});

		const userWeeklySummaries: UserWeeklySummary[] = users.map(
			(user) => {
				const summary =
					(weeklySummaries.find((weeklySummary) =>
						equals(user.id, weeklySummary.user)
					) || {}) as WeeklySummary;

				const pullRequestSummary = reduceAndMerge([
					summary?.pullRequestSummary || {},
					{
						pullRequestCreated: 0,
						pullRequestReviewed: 0,
						pullRequestReviewTime: 0,
					},
				]);

				const taskCycleSummaries = [
					TaskCycleSummaryType.TASK,
					TaskCycleSummaryType.BUG,
					TaskCycleSummaryType.STORY,
				].map((type) => {
					const taskCycleSummary = (summary?.taskCycleSummaries ||
						[]).find(
							(tcs: TaskCycleSummary) => equals(tcs.type, type),
						);

					return reduceAndMerge([{
						type,
						taskDoneCount: 0,
						taskDoneCycleTime: 0,
						taskCyclePoints: 0,
					}, omit(['type'])(taskCycleSummary)]);
				});

				return {
					...summary,
					pullRequestSummary,
					taskCycleSummaries,
					taskCycleAverageTime: taskCycleSummaries.reduce(
						(avg, curr) => {
							return avg +
								(curr.taskDoneCycleTime /
									(curr.taskDoneCount || 1));
						},
						0,
					),
					user,
				};
			},
		);

		const footer = userWeeklySummaries.reduce((accum, curr) => {
			const taskCycleSummary: Record<
				TaskCycleSummaryType,
				TaskCycleSummary
			> = fromPairs(
				(curr.taskCycleSummaries || []).map(
					(tcs) => [tcs.type, tcs],
				),
			);
			const totalTaskCycleSummary = accum.totalTaskCycleSummary || {};
			return {
				...reduceAndMerge([accum || {}, {
					totalPullRequestReviewed:
						curr.pullRequestSummary?.pullRequestReviewed || 0,
					totalPullRequestCreated:
						curr.pullRequestSummary?.pullRequestCreated || 0,
					totalPullRequestReviewTime:
						curr.pullRequestSummary?.pullRequestReviewTime || 0,
					totalTaskCycleAverageTime: curr.taskCycleAverageTime || 0,
				}]),
				totalTaskCycleSummary: fromPairs(
					toPairs(taskCycleSummary)
						.map(
							(
								[type, tcs]: [
									TaskCycleSummaryType,
									TaskCycleSummary,
								],
							) => {
								return [
									type,
									reduceAndMerge([tcs, {
										taskDoneCount:
											totalTaskCycleSummary[type]
												?.taskDoneCount || 0,
										taskDoneCycleTime:
											totalTaskCycleSummary[type]
												?.taskDoneCycleTime || 0,
									}]),
								];
							},
						),
				),
			};
		}, {} as WeeklySummaryPullRequesTableFooter);

		return ctx.render({
			weekDateRange: `${date.startOf('week').toFormat('MM/dd/yyyy')} - ${
				date.endOf('week').toFormat('MM/dd/yyyy')
			}`,
			userWeeklySummaries,
			footer: {
				...footer,
				weekNumber: date.weekNumber,
			},
		});
	},
};

export default function Home(
	{ data }: {
		data: PageProps;
	},
) {
	return (
		<>
			<link
				rel='stylesheet'
				href='/css/flowbite.min.css'
			/>

			<div class='bg-gray-100 h-screen'>
				<WeeklyPullRequestSummaryTable
					weekDateRange={data.weekDateRange}
					userWeeklySummaries={data.userWeeklySummaries}
					footer={data.footer}
				/>

				<WeeklyTaskSummaryTable
					weekDateRange={data.weekDateRange}
					userWeeklySummaries={data.userWeeklySummaries}
					footer={data.footer}
				/>
			</div>

			<script src='/js/flowbite.bundle.js' />
		</>
	);
}
