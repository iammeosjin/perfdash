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
					pullRequestSummary,
					tasksCreated: summary?.tasksCreated?.length || 0,
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

			const footer = userWeeklySummaries.reduce(
				(accum, curr) => {
					const taskCycleSummary: Record<
						TaskCycleSummaryType,
						TaskCycleSummary
					> = fromPairs(
						(curr.taskCycleSummaries || []).map(
							(tcs) => [tcs.type, tcs],
						),
					);

					const totalTaskCycleSummary = accum.totalTaskCycleSummary ||
						{};
					return {
						...reduceAndMerge([accum || {}, {
							totalTaskCreated: curr.tasksCreated || 0,
							totalPullRequestReviewed:
								curr.pullRequestSummary?.pullRequestReviewed ||
								0,
							totalPullRequestCreated:
								curr.pullRequestSummary?.pullRequestCreated ||
								0,
							totalPullRequestReviewTime: curr.pullRequestSummary
								?.pullRequestReviewTime || 0,
							totalTaskCycleAverageTime:
								curr.taskCycleAverageTime ||
								0,
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
														?.taskDoneCycleTime ||
													0,
											}]),
										];
									},
								),
						),
					};
				},
				{} as WeeklySummaryPullRequesTableFooter,
			);

			const date = DateTime.fromObject({
				weekYear: +ctx.params.year,
				weekNumber,
			}).setZone(TIMEZONE);

			return [
				weekNumber,
				{
					...footer,
					year: date.year,
					month: date.month,
					weekDateRange: `${
						date.startOf('week').toFormat('MM/dd/yyyy')
					} - ${date.endOf('week').toFormat('MM/dd/yyyy')}`,
				},
			];
		});

		return ctx.render({
			monthlySummaries,
			team,
			year: date.year,
			month: date.month,
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
			year: number;
			month: number;
			monthDateRange: string;
			monthlySummaries: [
				number,
				WeeklySummaryPullRequesTableFooter & { weekDateRange: string },
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
				<section class='antialiased bg-gray-100 text-gray-600 py-10 px-4'>
					<div class='flex flex-col justify-center h-full'>
						<div class='w-full max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200'>
							<header class='px-5 py-4 border-b border-gray-100'>
								<div class='flex w-full justify-between space-between'>
									<h1 class='text-xl font-bold text-blue-600 hover:text-blue-800'>
										<a
											href={`/backends/${data.team}/${data.year}/${data.month}/pull-requests`}
										>
											Pull Request Interaction Summary
											({data
												.monthDateRange})
										</a>
									</h1>
									<a
										href='/doc'
										class='place-self-end text-gray-500 hover:text-blue-500 transition-colors text-left mb-5'
									>
										&#8505; Read Doc
									</a>
								</div>
							</header>
							<div class='overflow-x-auto'>
								<table class='table-auto w-full p-3 mb-5'>
									<thead class='text-xs font-semibold uppercase text-gray-400 bg-gray-50'>
										<tr>
											<th class='p-2 whitespace-nowrap'>
												<div class='font-semibold text-center'>
													Week Number
												</div>
											</th>
											<th class='p-2 whitespace-nowrap'>
												<div class='font-semibold text-center'>
													PR Reviewed
												</div>
											</th>
											<th class='p-2 whitespace-nowrap'>
												<div class='font-semibold text-center'>
													PR Created
												</div>
											</th>
											<th class='p-2 whitespace-nowrap'>
												<div class='font-semibold text-center'>
													PR Review Lead Time
												</div>
											</th>
											<th class='p-2 whitespace-nowrap'>
												<div class='font-semibold text-center'>
													PR Merge Rate
												</div>
											</th>
										</tr>
									</thead>
									<tbody class='text-sm divide-y divide-gray-100'>
										{monthlySummaries.map(
											([weekNumber, summary]) => (
												<tr class='cursor-pointer text-lg font-semibold'>
													<td class='p-2 whitespace-nowrap'>
														<div class='text-center'>
															<div
																data-tooltip-target={`tooltip-date-${weekNumber}`}
																data-tooltip-placement='top'
																class='flex-shrink-0 mr-2 sm:mr-3'
															>
																<div class='text-center'>
																	{weekNumber}
																</div>
															</div>
															<div
																id={`tooltip-date-${weekNumber}`}
																role='tooltip'
																class='tooltip absolute z-10 inline-block bg-gray-900 font-medium shadow-sm text-white py-2 px-3 text-sm rounded-lg opacity-0 invisible'
																data-popper-reference-hidden=''
																data-popper-escaped=''
																data-popper-placement='top'
																style='position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate3d(918px, 449px, 0px);'
															>
																{summary
																	.weekDateRange}
																<div
																	class='tooltip-arrow'
																	data-popper-arrow=''
																	style='position: absolute; left: 0px; transform: translate3d(54px, 0px, 0px);'
																>
																</div>
															</div>
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div class='text-center'>
															{summary
																.totalPullRequestReviewed}
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div class='text-center'>
															{summary
																.totalPullRequestCreated}
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div class='text-center'>
															{formatTime(
																summary
																	.totalPullRequestReviewTime,
															)}
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div class='text-center'>
															{formatTime(
																(summary
																	?.totalPullRequestReviewTime ||
																	0) /
																	(summary
																		?.totalPullRequestCreated ||
																		1),
															)}
														</div>
													</td>
												</tr>
											),
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</section>

				<section class='antialiased bg-gray-100 text-gray-600 py-10 px-4'>
					<div class='flex flex-col justify-center h-full'>
						<div class='w-full max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200'>
							<header class='px-5 py-4 border-b border-gray-100'>
								<div class='flex w-full justify-between space-between'>
									<h1 class='text-xl font-bold text-blue-600 hover:text-blue-800'>
										<a
											href={`/backends/${data.team}/${data.year}/${data.month}/tasks`}
										>
											Task Cycle Summary ({data
												.monthDateRange})
										</a>
									</h1>
									<a
										href='/doc'
										class='place-self-end text-gray-500 hover:text-blue-500 transition-colors text-left mb-5'
									>
										&#8505; Read Doc
									</a>
								</div>
							</header>
							<div class='overflow-x-auto'>
								<table class='table-auto w-full p-3 mb-5'>
									<thead class='text-xs font-semibold uppercase text-gray-400 bg-gray-50'>
										<tr>
											<th
												rowSpan={2}
												class='p-2 whitespace-nowrap align-middle'
											>
												<div class='font-semibold text-center'>
													Week Number
												</div>
											</th>
											<th
												rowSpan={2}
												class='p-2 whitespace-nowrap w-1/3 text-center '
											>
												<div class='font-semibold text-center'>
													Cards Created
												</div>
											</th>
											<th
												colSpan={4}
												class='p-2 whitespace-nowrap w-1/3 text-center '
											>
												<div class='font-semibold text-center'>
													Cards Done
												</div>
											</th>
											<th
												rowSpan={2}
												class='p-2 whitespace-nowrap align-middle'
											>
												<div class='font-semibold text-center'>
													Avg Cycle Time (In Progress
													to Done)
												</div>
											</th>
										</tr>
										<tr>
											{[
												'Tasks',
												'Bugs',
												'Stories',
												'Epics',
											]
												.map((type) => {
													return (
														<th
															scope='col'
															class=' whitespace-nowrap'
														>
															<div class='font-semibold text-center'>
																{type}
															</div>
														</th>
													);
												})}
										</tr>
									</thead>
									<tbody class='text-sm divide-y divide-gray-100'>
										{data.monthlySummaries.map(
											([weekNumber, summary]) => {
												return (
													<tr class='cursor-pointer text-lg font-semibold'>
														<td class='p-2 whitespace-nowrap'>
															<div class='text-center'>
																<div
																	data-tooltip-target={`tooltip-date-${weekNumber}`}
																	data-tooltip-placement='top'
																	class='flex-shrink-0 mr-2 sm:mr-3'
																>
																	<div class='text-center'>
																		{weekNumber}
																	</div>
																</div>

																<div
																	id={`tooltip-date-${weekNumber}`}
																	role='tooltip'
																	class='tooltip absolute z-10 inline-block bg-gray-900 font-medium shadow-sm text-white py-2 px-3 text-sm rounded-lg opacity-0 invisible'
																	data-popper-reference-hidden=''
																	data-popper-escaped=''
																	data-popper-placement='top'
																	style='position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate3d(918px, 449px, 0px);'
																>
																	{summary
																		.weekDateRange}
																	<div
																		class='tooltip-arrow'
																		data-popper-arrow=''
																		style='position: absolute; left: 0px; transform: translate3d(54px, 0px, 0px);'
																	>
																	</div>
																</div>
															</div>
														</td>
														<td class='p-2 whitespace-nowrap'>
															<div class='text-center'>
																{summary
																	.totalTaskCreated ||
																	0}
															</div>
														</td>

														{[
															TaskCycleSummaryType
																.TASK,
															TaskCycleSummaryType
																.BUG,
															TaskCycleSummaryType
																.STORY,
															TaskCycleSummaryType
																.EPIC,
														].map((type) => {
															const total =
																summary
																	?.totalTaskCycleSummary[
																		type
																	];
															const toolTipId =
																`tooltip-total-${type}-done-${weekNumber}`;
															return (
																<th class='p-2 whitespace-nowrap'>
																	<div
																		data-tooltip-target={toolTipId}
																		data-tooltip-placement='top'
																		class='flex-shrink-0 mr-2 sm:mr-3'
																	>
																		<div class='text-center'>
																			{total
																				?.taskDoneCount}
																		</div>
																	</div>
																	<div
																		id={toolTipId}
																		role='tooltip'
																		class='tooltip absolute z-10 inline-block bg-gray-900 font-medium shadow-sm text-white py-2 px-3 text-sm rounded-lg opacity-0 invisible'
																		data-popper-reference-hidden=''
																		data-popper-escaped=''
																		data-popper-placement='top'
																		style='position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate3d(918px, 449px, 0px);'
																	>
																		{formatTime(
																			total
																				?.taskDoneCycleTime as number,
																		)}
																		<div
																			class='tooltip-arrow'
																			data-popper-arrow=''
																			style='position: absolute; left: 0px; transform: translate3d(54px, 0px, 0px);'
																		>
																		</div>
																	</div>
																</th>
															);
														})}

														<td class='p-2 whitespace-nowrap'>
															<div class='text-center'>
																{formatTime(
																	summary
																		.totalTaskCycleAverageTime,
																)}
															</div>
														</td>
													</tr>
												);
											},
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</section>
			</div>

			<script src='/js/flowbite.bundle.js' />
		</>
	);
}
