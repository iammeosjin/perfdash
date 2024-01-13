import { Handlers } from '$fresh/server.ts';
import UserModel from '../models/user.ts';
import UserWeeklySummaryModel from '../models/user-weekly-summary.ts';
import TaskModel from '../models/task.ts';

export const handler: Handlers = {
	async GET() {
		return new Response(JSON.stringify({
			weeklyStats: await UserWeeklySummaryModel.list(),
		}));
	},
};
