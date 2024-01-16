import { User, UserWeeklySummary } from '../types/common.ts';

interface Props {
	standings: (UserWeeklySummary & {
		totalPoints: number;
		boosters?: User[];
	})[];
	dateRange: string;
	status: 'OPEN' | 'CLOSED';
}

export default function WeeklyStandings(props: Props) {
	const { standings, status, dateRange } = props;
	return (
		<section class='antialiased bg-gray-100 text-gray-600 py-10 px-4'>
			<div class='flex flex-col justify-center h-full'>
				<div class='w-full max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200'>
					<header class='px-5 py-4 border-b border-gray-100'>
						<div class='flex w-full justify-between space-between'>
							<h1 class='font-bold text-gray-800'>
								Backends of the Week ({dateRange}){' '}
								<span
									class={status === 'OPEN'
										? 'text-green-600'
										: 'text-red-600'}
								>
									[{status}]
								</span>
							</h1>
							<a
								href='/doc'
								class='place-self-end text-gray-500 hover:text-blue-500 transition-colors text-left'
							>
								&#8505; Read Doc
							</a>
						</div>
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
												Total Points
											</div>
										</th>
										<th class='p-2 whitespace-nowrap'>
											<div class='font-semibold text-left'>
												Will Be Boosted By
											</div>
										</th>
									</tr>
								</thead>
								<tbody class='text-sm divide-y divide-gray-100'>
									{standings.map((userWeeklySummary) => {
										const image = '/images/rocket.png';
										const user = userWeeklySummary.user;
										return (
											<tr class='font-bold text-xl cursor-pointer'>
												<td class='p-2 whitespace-nowrap'>
													<div class='flex items-center'>
														<div class='w-8 h-8 flex-shrink-0 mr-2 sm:mr-3'>
															<img
																class='rounded'
																src={image}
																width='40'
																height='40'
															/>
														</div>
														<div class=''>
															{user.name}
														</div>
													</div>
												</td>
												<td class='p-2 whitespace-nowrap'>
													<div class='text-left'>
														{userWeeklySummary
															?.totalPoints
															?.toFixed(
																2,
															)}
													</div>
												</td>
												<td class='p-2 whitespace-nowrap'>
													<div class='flex items-center'>
														{(userWeeklySummary
															.boosters || [])
															.filter(
																(booster) =>
																	!!booster,
															).map(
																(booster) => {
																	return (
																		<>
																			<div
																				data-tooltip-target={`tooltip-${booster?.id}`}
																				data-tooltip-placement='top'
																				class='w-8 h-8 flex-shrink-0 mr-2 sm:mr-3'
																			>
																				<img
																					class='rounded'
																					src={booster
																						.image}
																					width='40'
																					height='40'
																				/>
																			</div>
																			<div
																				id={`tooltip-${booster.id}`}
																				role='tooltip'
																				class='tooltip absolute z-10 inline-block bg-gray-900 font-medium shadow-sm text-white py-2 px-3 text-sm rounded-lg opacity-0 invisible'
																				data-popper-reference-hidden=''
																				data-popper-escaped=''
																				data-popper-placement='top'
																				style='position: absolute; inset: auto auto 0px 0px; margin: 0px; transform: translate3d(918px, 449px, 0px);'
																			>
																				{booster
																					.name}
																				<div
																					class='tooltip-arrow'
																					data-popper-arrow=''
																					style='position: absolute; left: 0px; transform: translate3d(54px, 0px, 0px);'
																				>
																				</div>
																			</div>
																		</>
																	);
																},
															)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
