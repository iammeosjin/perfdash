// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from './routes/_404.tsx';
import * as $_app from './routes/_app.tsx';
import * as $api_joke from './routes/api/joke.ts';
import * as $api_users from './routes/api/users.ts';
import * as $backend_team_year_month_day_ from './routes/backend/[team]/[year]/[month]/[day].tsx';
import * as $greet_name_ from './routes/greet/[name].tsx';
import * as $index from './routes/index.tsx';
import * as $version from './routes/version.ts';
import * as $Counter from './islands/Counter.tsx';
import { type Manifest } from '$fresh/server.ts';

const manifest = {
	routes: {
		'./routes/_404.tsx': $_404,
		'./routes/_app.tsx': $_app,
		'./routes/api/joke.ts': $api_joke,
		'./routes/api/users.ts': $api_users,
		'./routes/backend/[team]/[year]/[month]/[day].tsx':
			$backend_team_year_month_day_,
		'./routes/greet/[name].tsx': $greet_name_,
		'./routes/index.tsx': $index,
		'./routes/version.ts': $version,
	},
	islands: {
		'./islands/Counter.tsx': $Counter,
	},
	baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
