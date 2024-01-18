import formatTime from '../libs/format-time.ts';
import { DEFAULT_IMAGE } from '../libs/constants.ts';
import {
	PullRequestSummary,
	TaskCycleSummaryType,
	UserWeeklySummary,
} from '../types/common.ts';
import reduceAndMerge from '../libs/reduce-and-merge.ts';
import { WeeklySummaryPullRequesTableFooter } from '../types/ui.ts';
import { UserImageHolder } from '../components/user-image-holder.tsx';

interface Props {
	weekDateRange: string;
	userWeeklySummaries: UserWeeklySummary[];
	footer?: WeeklySummaryPullRequesTableFooter;
}

export default function WeeklyTaskSummaryTable(props: Props) {
	const { userWeeklySummaries, footer, weekDateRange } = props;

	return (
		<section class='antialiased bg-gray-100 text-gray-600 py-10 px-4 cursor-pointer'>
			<div class='flex flex-col justify-center h-full'>
				<div class='w-full max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200'>
					<header class='px-5 py-4 border-b border-gray-100'>
						<h1 class='font-bold text-gray-800'>
							Backends Task Cycle Weekly Stats ({weekDateRange})
						</h1>
					</header>
					<div class='p-3'>
						<div class='overflow-x-auto'>
							<table class='table-auto w-full'>
								<thead class='text-xs font-semibold uppercase text-gray-400 bg-gray-50'>
									<tr>
										<th
											rowSpan={2}
											class='p-2 whitespace-nowrap align-middle'
										>
											<div class='font-semibold text-left'>
												Name
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
											rowSpan={1}
											class='p-2 whitespace-nowrap align-middle'
										>
											<div class='font-semibold text-left'>
												Avg Cycle Time (In Progress to
												Done)
											</div>
										</th>
									</tr>
									<tr>
										{['Tasks', 'Bugs', 'Stories', 'Epics']
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
									{userWeeklySummaries.map(
										(userWeeklySummary) => {
											const user = userWeeklySummary.user;
											return (
												<tr>
													<td class='p-2 whitespace-nowrap'>
														<UserImageHolder
															link={user.image}
															name={user.name}
														/>
													</td>
													{(userWeeklySummary
														.taskCycleSummaries ||
														[])
														.map(
															(
																taskCycleSummary,
															) => {
																const toolTipId =
																	`tooltip-${taskCycleSummary.type}-done-${user.username}-${userWeeklySummary.weekNumber}`;

																return (
																	<td class='whitespace-nowrap'>
																		<div
																			data-tooltip-target={toolTipId}
																			data-tooltip-placement='top'
																			class='flex-shrink-0 mr-2 sm:mr-3'
																		>
																			<div class='text-center'>
																				{taskCycleSummary
																					.taskDoneCount}
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
																				taskCycleSummary
																					.taskDoneCycleTime,
																			)}
																			<div
																				class='tooltip-arrow'
																				data-popper-arrow=''
																				style='position: absolute; left: 0px; transform: translate3d(54px, 0px, 0px);'
																			>
																			</div>
																		</div>
																	</td>
																);
															},
														)}

													<td class='p-2 whitespace-nowrap'>
														<div class='text-left'>
															{formatTime(
																userWeeklySummary
																	.taskCycleAverageTime,
															)}
														</div>
													</td>
												</tr>
											);
										},
									)}
								</tbody>
								{(Object.values(
										footer?.totalTaskCycleSummary || {},
									)
										.some((tcs) => tcs.taskDoneCount > 0))
									? (
										<tfoot class='text-sm divide-y divide-gray-100 '>
											<tr
												class={`font-semibold text-left`}
											>
												<th class='p-2 whitespace-nowrap'>
												</th>

												{[
													TaskCycleSummaryType.TASK,
													TaskCycleSummaryType.BUG,
													TaskCycleSummaryType.STORY,
													TaskCycleSummaryType.EPIC,
												].map((type) => {
													const summary = footer
														?.totalTaskCycleSummary[
															type
														];
													const toolTipId =
														`tooltip-total-${type}-done-${footer?.weekNumber}`;
													return (
														<th class='p-2 whitespace-nowrap'>
															<div
																data-tooltip-target={toolTipId}
																data-tooltip-placement='top'
																class='flex-shrink-0 mr-2 sm:mr-3'
															>
																<div class='text-center'>
																	{summary
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
																	summary
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

												<th class='p-2 whitespace-nowrap text-left'>
													<div>
														{formatTime(
															footer
																?.totalTaskCycleAverageTime,
														)}
													</div>
												</th>
											</tr>
										</tfoot>
									)
									: <></>}
							</table>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
