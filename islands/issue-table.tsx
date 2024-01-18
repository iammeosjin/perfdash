import { TASK_TYPE_COLOR_MAP } from '../libs/constants.ts';
import { Task } from '../types/task.ts';

const statusMap: Record<string, number> = {
	'Done': 5,
	'UAT Failed (Production)': 4,
	'UAT Failed (Staging)': 4,
	'UAT (Production)': 3,
	'UAT (Staging)': 3,
	'Ready for Release': 2,
	'In Progress': 2,
	Ready: 1,
	Backlog: 1,
};

export default function IssueTable(props: { issues: Task[] }) {
	const { issues } = props;

	return (
		<table
			id='issueTable'
			class='hover table-auto'
			style='width:100%; padding-top: 1em;  padding-bottom: 1em;'
		>
			<thead class='text-xs font-semibold uppercase text-gray-400 bg-gray-50'>
				<tr>
					<th data-priority='9' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Default sort
						</div>
					</th>
					<th data-priority='1' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Issue
						</div>
					</th>
					<th data-priority='6' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Type
						</div>
					</th>
					<th data-priority='2' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Status
						</div>
					</th>
					<th data-priority='7' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Reporter
						</div>
					</th>
					<th data-priority='5' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Assignee
						</div>
					</th>
					<th data-priority='8' class='p-2 whitespace-nowrap'>
						<div class='font-semibold text-center'>
							Date Created
						</div>
					</th>
				</tr>
			</thead>
			<tbody class='text-base font-semibold divide-y divide-gray-100'>
				{issues.map((issue) => {
					return (
						<tr class='cursor-pointer' // onClick={() =>
							// 	window.location =
							// 		`/issues/${issue.id}` as unknown as Location}
						>
							<td class='p-2 whitespace-nowrap'>
								<div class='flex items-center'>
									{`${issue.dateTimeCreated || issue.key}`}
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div class='flex items-center'>
									<a
										href={issue.link}
										class='hover:underline hover:text-blue-500'
									>
										{issue.key}
									</a>
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div
									class={`text-center text-${TASK_TYPE_COLOR_MAP[
										issue.type
									] as string}`}
								>
									{issue.type}
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div class='text-center'>
									{issue.status?.toUpperCase()}
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div class='text-center'>
									{issue.reporter?.name}
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div class='text-center'>
									{issue.assignee?.name}
								</div>
							</td>
							<td class='p-2 whitespace-nowrap'>
								<div class='text-left'>
									{issue.dateTimeCreated}
								</div>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
