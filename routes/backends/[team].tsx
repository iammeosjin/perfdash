import { Handlers } from '$fresh/server.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import equals from 'https://deno.land/x/ramda@v0.27.2/source/equals.js';
import sum from 'https://deno.land/x/ramda@v0.27.2/source/sum.js';
import pluck from 'https://deno.land/x/ramda@v0.27.2/source/pluck.js';
import sort from 'https://deno.land/x/ramda@v0.27.2/source/sort.js';
import prop from 'https://deno.land/x/ramda@v0.27.2/source/prop.js';
import descend from 'https://deno.land/x/ramda@v0.27.2/source/descend.js';
import {
	PullRequestSummary,
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
	User,
	UserWeeklySummary,
	WeeklySummary,
} from '../../types/common.ts';
import UserModel from '../../models/user.ts';
import { TIMEZONE } from '../../libs/constants.ts';
import UserWeeklySummaryModel from '../../models/user-weekly-summary.ts';
import { WeeklySummaryPullRequesTableFooter } from '../../types/ui.ts';
import WeeklyPullRequestSummaryTable from '../../islands/weekly-pull-request-summary-table.tsx';
import reduceAndMerge from '../../libs/reduce-and-merge.ts';
import WeeklyTaskSummaryTable from '../../islands/weekly-task-summary-table.tsx';
import formatTime from '../../libs/format-time.ts';
import WeeklyStandings from '../../islands/weekly-standings.tsx';

export const handler: Handlers = {
	async GET(_, ctx) {
		let users: User[] = await UserModel.list();

		const team = ctx.params.team as Team;

		users = users.filter((user) => (user.teams || []).includes(team));

		const date = DateTime.now().setZone(TIMEZONE);

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

		let userWeeklySummaries: (UserWeeklySummary & {
			totalPoints: number;
			boosters?: User[];
		})[] = users.map(
			(user) => {
				const summary =
					(weeklySummaries.find((weeklySummary) =>
						equals(user.id, weeklySummary.user)
					) || {}) as WeeklySummary;

				const pullRequestSummary: PullRequestSummary = reduceAndMerge([
					summary?.pullRequestSummary || {},
					{
						pullRequestCreated: 0,
						pullRequestReviewed: 0,
						pullRequestReviewTime: 0,
					},
				]);

				const taskCycleSummaries: TaskCycleSummary[] = [
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

				const totalPoints = sum(
					pluck('taskCyclePoints')(taskCycleSummaries),
				);
				return {
					...summary,
					pullRequestSummary,
					taskCycleSummaries,
					totalPoints,
					taskCycleAverageTime: 0,
					user,
				};
			},
		);

		userWeeklySummaries = sort(
			descend(prop('totalPoints')),
			userWeeklySummaries,
		);

		const juniorWeeklySummaries = userWeeklySummaries.filter((summary) =>
			summary.user.level <= 1
		);

		const seniorWeeklySummaries = userWeeklySummaries.filter((summary) =>
			summary.user.level > 1
		);

		return ctx.render({
			weekDateRange: `${date.startOf('week').toFormat('MM/dd/yyyy')} - ${
				date.endOf('week').toFormat('MM/dd/yyyy')
			}`,
			juniorWeeklySummaries,
			seniorWeeklySummaries,
		});
	},
};

type PageProps = {
	juniorWeeklySummaries: (UserWeeklySummary & {
		totalPoints: number;
		boosters?: User[];
	})[];
	seniorWeeklySummaries: (UserWeeklySummary & {
		totalPoints: number;
		boosters?: User[];
	})[];
	weekDateRange: string;
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
				<WeeklyStandings
					standings={data.seniorWeeklySummaries}
					dateRange={data.weekDateRange}
					status='OPEN'
				/>

				<WeeklyStandings
					standings={data.juniorWeeklySummaries}
					dateRange={data.weekDateRange}
					status='OPEN'
				/>
			</div>

			<script src='/js/flowbite.bundle.js' />
		</>
	);
}
