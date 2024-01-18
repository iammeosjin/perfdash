import { Handlers, PageProps } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import equals from 'https://deno.land/x/ramda@v0.27.2/source/equals.js';
import UserModel from '../../../../../models/user.ts';
import {
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
	UserWeeklySummary,
	WeeklySummary,
} from '../../../../../types/common.ts';
import { TIMEZONE } from '../../../../../libs/constants.ts';
import getWeekDetails from '../../../../../libs/get-week-details.ts';
import UserWeeklySummaryModel from '../../../../../models/user-weekly-summary.ts';
import reduceAndMerge from '../../../../../libs/reduce-and-merge.ts';
import WeeklyTaskSummaryTable from '../../../../../islands/weekly-task-summary-table.tsx';

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

		const startOfMonth = getWeekDetails(
			date.startOf('month').toISO() as string,
		);
		const endOfMonth = getWeekDetails(
			date.endOf('month').toISO() as string,
		);

		const weekNumbers = [];
		for (let i = startOfMonth.weekNumber; i <= endOfMonth.weekNumber; i++) {
			weekNumbers.push(i);
		}

		const monthlySummaries = weekNumbers.map((weekNumber) => {
			const userWeeklySummaries = users.map((user) => {
				const summary = (weeklySummaries.find((weeklySummary) =>
					equals(user.id, weeklySummary.user) &&
					equals(weekNumber, weeklySummary.weekNumber)
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
					TaskCycleSummaryType.EPIC,
				].map((type) => {
					const taskCycleSummary = (summary?.taskCycleSummaries ||
						[]).find(
							(tcs: TaskCycleSummary) =>
								equals(tcs.type, type),
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
					tasksCreated: summary?.tasksCreated?.length || 0,
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
			});
			const date = DateTime.fromObject({
				weekYear: +ctx.params.year,
				weekNumber,
			}).setZone(TIMEZONE);
			return [
				weekNumber,
				{
					userWeeklySummaries,
					weekDateRange: `${
						date.startOf('week').toFormat('MM/dd/yyyy')
					} - ${date.endOf('week').toFormat('MM/dd/yyyy')}`,
				},
			];
		});

		return ctx.render({ monthlySummaries });
	},
};

export default function Home(
	{ data }: {
		data: {
			monthlySummaries: [
				number,
				{
					userWeeklySummaries: UserWeeklySummary[];
					weekDateRange: string;
				},
			][];
		};
	},
) {
	const { monthlySummaries } = data;
	return (
		<>
			<link
				rel='stylesheet'
				href='/css/flowbite.min.css'
			/>

			<div class='bg-gray-100 h-screen'>
				{monthlySummaries.map(
					([, { userWeeklySummaries, weekDateRange }]) => (
						<WeeklyTaskSummaryTable
							weekDateRange={weekDateRange}
							userWeeklySummaries={userWeeklySummaries}
						/>
					),
				)}
			</div>

			<script src='/js/flowbite.bundle.js' />
		</>
	);
}
