import { Handlers } from '$fresh/server.ts';
import UserModel from '../models/user.ts';
// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import { Team } from '../types/common.ts';

export const handler: Handlers = {
	GET(_, ctx) {
		const date = DateTime.now().toFormat('yyyy/MM/dd');
		return ctx.render({
			teams: Object.values(Team),
			date,
		});
	},
};

export default function Home(
	{ data }: {
		data: { teams: Team[]; date: string };
	},
) {
	return (
		<>
			<h1>Teams</h1>
			<ul>
				{data.teams.map((team) => (
					<li>
						<a href={`/backend/${team}/${data.date}`}>{team}</a>
					</li>
				))}
			</ul>
		</>
	);
}
