import { Handlers } from '$fresh/server.ts';
import { Head } from '$fresh/runtime.ts';
import allPass from 'https://deno.land/x/ramda@v0.27.2/source/allPass.js';
import reject from 'https://deno.land/x/ramda@v0.27.2/source/reject.js';
import isNil from 'https://deno.land/x/ramda@v0.27.2/source/isNil.js';
import { Team, User } from '../../../types/common.ts';
import {
	getUserByClickupHandle,
	getUserByJiraHandle,
} from '../../../controllers/user.ts';
import TaskModel from '../../../models/task.ts';
import IssueTable from '../../../islands/issue-table.tsx';
import { Task, TaskStatus } from '../../../types/task.ts';

function cleanObject<T = Record<string, unknown>>(obj: T) {
	return reject(isNil)(obj);
}

const userCache = new Map<string, User | null>();
async function getUser(handle: string, team: Team) {
	let user = userCache.get(handle);
	if (!user) {
		user = await (team === Team.NEXIUX
			? getUserByJiraHandle(handle)
			: getUserByClickupHandle(handle));
		userCache.set(handle, user);
	}
	return user;
}

export const handler: Handlers = {
	async GET(_, ctx) {
		const issues = await TaskModel.list({ prefix: [ctx.params.team] });

		return ctx.render({
			issues: issues.filter((issue) =>
				allPass([
					!!issue.reporter,
					issue.status !== TaskStatus.BACKLOG,
					issue.status !== TaskStatus.READY,
				])
			),
		});
	},
};

export default function Home({ data }: { data: { issues: Task[] } }) {
	return (
		<>
			<Head>
				<link
					rel='stylesheet'
					href='/css/flowbite.min.css'
				/>

				<link
					href='/css/jquery-3.7.1.dataTables.min.css'
					rel='stylesheet'
				/>
				<link
					href='/css/responsive-3.7.1.dataTables.min.css'
					rel='stylesheet'
				/>
				<link
					href='/css/dataTable-3.7.1.css'
					rel='stylesheet'
				/>
			</Head>

			<div class='bg-gray-100'>
				<div class='container w-full mx-auto px-2'>
					<div class='p-8 lg:mt-3 my-6 rounded shadow bg-white'>
						<header class='px-5 py-4 border-b '>
							<h1 class='font-bold text-gray-800'>
								Backends Issues
							</h1>
						</header>
						<IssueTable issues={data.issues} />
					</div>
				</div>
			</div>

			<script src='/js/flowbite.bundle.js'>
			</script>
			<script
				type='text/javascript'
				src='/js/jquery-3.7.1.min.js'
			/>

			<script
				type='text/javascript'
				src='/js/jquery-3.7.1.dataTables.min.js'
			/>
			<script src='/js/dataTables-3.7.1.bootstrap.min.js' />
			<script src='/js/dataTables-3.7.1.responsive.js' />
			<script
				type='text/javascript'
				src='/js/table.js'
			/>
		</>
	);
}
