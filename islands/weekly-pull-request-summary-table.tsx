import formatTime from '../libs/format-time.ts';
import { DEFAULT_IMAGE } from '../libs/constants.ts';
import { PullRequestSummary, UserWeeklySummary } from '../types/common.ts';
import reduceAndMerge from '../libs/reduce-and-merge.ts';
import { WeeklySummaryPullRequesTableFooter } from '../types/ui.ts';
import { UserImageHolder } from '../components/user-image-holder.tsx';

interface Props {
	weekDateRange: string;
	userWeeklySummaries: UserWeeklySummary[];
	footer: WeeklySummaryPullRequesTableFooter;
}

export default function WeeklyPullRequestSummaryTable(props: Props) {
	const { userWeeklySummaries, footer, weekDateRange } = props;

	return (
		<section class='antialiased bg-gray-100 text-gray-600 py-10 px-4'>
			<div class='flex flex-col justify-center h-full'>
				<div class='w-full max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200'>
					<header class='px-5 py-4 border-b border-gray-100'>
						<h1 class='font-bold text-gray-800'>
							Backends Pull Review Weekly Stats ({weekDateRange})
						</h1>
					</header>
					<div class='p-3'>
						<div class='overflow-x-auto'>
							<table class='table-auto w-full'>
								<thead class='text-xs font-semibold uppercase text-gray-400 bg-gray-50'>
									<tr>
										<th class='p-2 whitespace-nowrap'>
											<div class='font-semibold text-left'>
												Name
											</div>
										</th>
										<th class='p-2 whitespace-nowrap'>
											<div class='font-semibold text-left'>
												PR Reviewed
											</div>
										</th>
										<th class='p-2 whitespace-nowrap'>
											<div class='font-semibold text-left'>
												PR Created
											</div>
										</th>
										<th class='p-2 whitespace-nowrap'>
											<div class='font-semibold text-left'>
												PR Review Lead Time
											</div>
										</th>
									</tr>
								</thead>
								<tbody class='text-sm divide-y divide-gray-100'>
									{userWeeklySummaries.map(
										(userWeeklySummary) => {
											const pullRequestSummary =
												userWeeklySummary
													.pullRequestSummary as PullRequestSummary;
											const user = userWeeklySummary.user;

											return (
												<tr class='cursor-pointer'>
													<td class='p-2 whitespace-nowrap'>
														<UserImageHolder
															link={user.image}
															name={user.name}
														/>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div
															class={`text-left ${
																pullRequestSummary
																		.pullRequestReviewed
																	? ''
																	: 'text-red-600 font-bold'
															}`}
														>
															{pullRequestSummary
																.pullRequestReviewed}
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div
															class={`text-left ${
																pullRequestSummary
																		.pullRequestCreated
																	? ''
																	: 'text-red-600 font-bold'
															}`}
														>
															{pullRequestSummary
																.pullRequestCreated}
														</div>
													</td>
													<td class='p-2 whitespace-nowrap'>
														<div
															class={`text-left ${
																pullRequestSummary
																		.pullRequestReviewTime
																	? ''
																	: 'text-red-600 font-bold'
															}`}
														>
															{formatTime(
																pullRequestSummary
																	.pullRequestReviewTime,
															)}
														</div>
													</td>
												</tr>
											);
										},
									)}
								</tbody>
								{footer.totalPullRequestCreated ||
										footer.totalPullRequestReviewTime ||
										footer.totalPullRequestReviewed
									? (
										<tfoot class='text-sm divide-y divide-gray-100'>
											<tr
												class={`font-semibold text-left`}
											>
												<th class='p-2 whitespace-nowrap'>
												</th>
												<th class='p-2 whitespace-nowrap cursor-pointer'>
													<div>
														{footer
															.totalPullRequestReviewed}
													</div>
												</th>
												<th class='p-2 whitespace-nowrap cursor-pointer'>
													<div>
														{footer
															.totalPullRequestCreated}
													</div>
												</th>
												<th class='p-2 whitespace-nowrap cursor-pointer'>
													<div>
														{formatTime(
															footer
																.totalPullRequestReviewTime,
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
