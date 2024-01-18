import { Handlers, PageProps } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import equals from 'https://deno.land/x/ramda@v0.27.2/source/equals.js';
import UserModel from '../../../../models/user.ts';
import {
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
	UserWeeklySummary,
	WeeklySummary,
} from '../../../../types/common.ts';
import { TIMEZONE } from '../../../../libs/constants.ts';
import getWeekDetails from '../../../../libs/get-week-details.ts';
import UserWeeklySummaryModel from '../../../../models/user-weekly-summary.ts';
import reduceAndMerge from '../../../../libs/reduce-and-merge.ts';
import WeeklyPullRequestSummaryTable from '../../../../islands/weekly-pull-request-summary-table.tsx';
import fromPairs from 'https://deno.land/x/ramda@v0.27.2/source/fromPairs.js';
import { WeeklySummaryPullRequesTableFooter } from '../../../../types/ui.ts';
import formatTime from '../../../../libs/format-time.ts';
import toPairs from 'https://deno.land/x/ramda@v0.27.2/source/toPairs.js';
import { format } from '$std/path/format.ts';
import WeeklyTaskSummaryTable from '../../../../islands/weekly-task-summary-table.tsx';
import pick from 'https://deno.land/x/ramda@v0.27.2/source/pick.js';

export const handler: Handlers = {
	async GET(_, ctx) {
		const team = ctx.params.team as Team;

		const date = DateTime.fromObject({
			year: +ctx.params.year,
			month: +ctx.params.month,
		}).setZone(TIMEZONE);

		const users = await UserModel.list().then(
			(users) =>
				users.filter((user) => (user.teams || []).includes(team)),
		);

		const weeklySummaries = await UserWeeklySummaryModel.list({
			prefix: [
				team,
				date.year.toString(),
				date.month.toString(),
			],
		});

		const userMonthlySummary: UserWeeklySummary[] = users.map(
			(user) => {
				const summaries = weeklySummaries.filter((weeklySummary) =>
					equals(user.id, weeklySummary.user)
				);

				const summary = summaries.reduce((accum, curr) => {
					const pullRequestSummary = reduceAndMerge([
						accum?.pullRequestSummary || {
							pullRequestCreated: 0,
							pullRequestReviewed: 0,
							pullRequestReviewTime: 0,
						},
						pick([
							'pullRequestCreated',
							'pullRequestReviewed',
							'pullRequestReviewTime',
						])(curr?.pullRequestSummary || {}),
					]);
					const taskCycleSummaries = [
						TaskCycleSummaryType.TASK,
						TaskCycleSummaryType.BUG,
						TaskCycleSummaryType.STORY,
						TaskCycleSummaryType.EPIC,
					].map((type) => {
						const taskCycleSummary =
							(accum?.taskCycleSummaries || []).find((
								tcs: TaskCycleSummary,
							) => equals(tcs.type, type));

						return reduceAndMerge([
							{
								type,
								taskDoneCount: 0,
								taskDoneCycleTime: 0,
								taskCyclePoints: 0,
								...(taskCycleSummary || {}),
							},
							omit(['type'])((curr?.taskCycleSummaries ||
								[]).find(
									(tcs: TaskCycleSummary) =>
										equals(tcs.type, type),
								)),
						]);
					});
					return reduceAndMerge([{
						...accum,
						pullRequestSummary,
						taskCycleSummaries,
					}, {
						tasksCreated: curr?.tasksCreated?.length || 0,
						taskCycleAverageTime: taskCycleSummaries.reduce(
							(avg, curr) => {
								return avg +
									(curr.taskDoneCycleTime /
										(curr.taskDoneCount || 1));
							},
							0,
						),
					}]);
				}, {} as UserWeeklySummary);
				return {
					...summary,
					user,
				};
			},
		);

		const footer = userMonthlySummary.reduce((accum, curr) => {
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
					totalTaskCreated: curr.tasksCreated || 0,
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
			userMonthlySummary,
			footer: {
				...footer,
				weekNumber: date.weekNumber,
			},
			team,
			monthDateRange: `${
				date.startOf('month').toFormat('MM/dd/yyyy')
			} - ${date.endOf('month').toFormat('MM/dd/yyyy')}`,
		});
	},
};

export default function Home(
	{ data }: {
		data: {
			team: Team;
			monthDateRange: string;
			footer: WeeklySummaryPullRequesTableFooter;
			userMonthlySummary: UserWeeklySummary[];
		};
	},
) {
	const { userMonthlySummary } = data;
	return (
		<>
			<link
				rel='stylesheet'
				href='/css/flowbite.min.css'
			/>

			<div class='bg-gray-100 h-screen'>
				<WeeklyPullRequestSummaryTable
					weekDateRange={data.monthDateRange}
					userWeeklySummaries={data.userMonthlySummary}
					footer={data.footer}
				/>

				<WeeklyTaskSummaryTable
					weekDateRange={data.monthDateRange}
					userWeeklySummaries={data.userMonthlySummary}
					footer={data.footer}
				/>
			</div>

			<script src='/js/flowbite.bundle.js' />
		</>
	);
}
