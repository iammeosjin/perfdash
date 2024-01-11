import { Handlers } from '$fresh/server.ts';
import { useSignal } from '@preact/signals';
import Counter from '../islands/Counter.tsx';
import UserModel from '../models/user.ts';
import UserWeeklySummaryModel from '../models/user-weekly-summary.ts';

export const handler: Handlers = {
	async GET() {
		return new Response(JSON.stringify({
			users: await UserModel.list(),
			weeklyStats: await UserWeeklySummaryModel.list(),
		}));
	},
};
