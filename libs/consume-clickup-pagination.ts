// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import pluck from 'https://deno.land/x/ramda@v0.27.2/source/pluck.js';
import { getUserByClickupHandle } from '../controllers/user.ts';
import calculateCycleTimeMetricsPoints from './calculate-cycle-time-metrics-points.ts';
import {
	ID,
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
} from '../types/common.ts';
import { SCORE_METRICS, TIMEZONE } from './constants.ts';
import { ClickupRequestOption, TaskStatus, TaskType } from '../types/task.ts';
import reduceAndMerge from './reduce-and-merge.ts';
import { ClickupAPI } from '../apis/clickup.ts';

type JiraResponse = {
	weeklySummary: Record<string, { user: ID } & TaskCycleSummary>;
};

export default async function consumeClickupPagination(
	response: JiraResponse,
	options: {
		team: Team.OPEXA;
		dateStarted: string;
		dateEnded: string;
	} & Partial<ClickupRequestOption>,
) {
	const page = options.page || 0;
	const result = await ClickupAPI.getTasks(
		{ endDate: options.dateEnded, startDate: options.dateStarted },
		{ page },
	);

	const taskCycles = await ClickupAPI.getTasksTimeInStatus({
		taskIds: pluck('key')(result.tasks),
	});

	await Bluebird.reduce(
		result.tasks,
		async (weeklySummary, task) => {
			const status = ClickupAPI.parseStatus(task.status);
			const type = ClickupAPI.parseType(task.type);

			if (
				![
					TaskType.BUG,
					TaskType.STORY,
					TaskType.DEFECT,
					TaskType.TASK,
					TaskType.SUBTASK,
				].includes(type)
			) {
				return weeklySummary;
			}

			if (status !== TaskStatus.DONE) {
				return weeklySummary;
			}

			if (!task.assignee) {
				return weeklySummary;
			}

			const assignee = await getUserByClickupHandle(task.assignee);

			if (!assignee) {
				return weeklySummary;
			}

			let taskCycleSummaryType = TaskCycleSummaryType.TASK;

			if (type === TaskType.STORY) {
				taskCycleSummaryType = TaskCycleSummaryType.STORY;
			} else if (type === TaskType.BUG) {
				taskCycleSummaryType = TaskCycleSummaryType.BUG;
			}

			const startOfWeek = DateTime.fromMillis(
				+(task.dateDone || task.dateUpdated),
			).startOf(
				'week',
			).setZone(
				TIMEZONE,
			).toISO() as string;

			const assigneeKey = [
				startOfWeek,
				task.assignee,
				taskCycleSummaryType,
			].join(';');

			const userWeeklySummary = reduceAndMerge([
				{
					...(weeklySummary[assigneeKey] || {}),
					user: assignee ? assignee.id : [],
					type: taskCycleSummaryType,
				},
				{
					taskDoneCount: 0,
					taskDoneCycleTime: 0,
					taskCyclePoints: 0,
				},
			]);
			const cycleTime = (taskCycles[task.key] || 0) * 60;

			userWeeklySummary.taskDoneCount += 1;
			userWeeklySummary.taskDoneCycleTime += cycleTime;

			if (userWeeklySummary.type === TaskCycleSummaryType.STORY) {
				userWeeklySummary.taskCyclePoints += assignee.level === 1
					? SCORE_METRICS.JUNIORS.SDC.MAX
					: SCORE_METRICS.SENIORS.SDC.MAX;
			} else if (userWeeklySummary.type === TaskCycleSummaryType.BUG) {
				userWeeklySummary.taskCyclePoints += assignee.level === 1
					? SCORE_METRICS.JUNIORS.BDC.MAX
					: SCORE_METRICS.SENIORS.BDC.MAX;
			} else {
				userWeeklySummary.taskCyclePoints += assignee.level === 1
					? SCORE_METRICS.JUNIORS.STDC
					: SCORE_METRICS.SENIORS.STDC;
			}

			const metrics = assignee.level === 1
				? SCORE_METRICS.JUNIORS.STCT
				: SCORE_METRICS.SENIORS.STCT;

			userWeeklySummary.taskCyclePoints +=
				calculateCycleTimeMetricsPoints(
					cycleTime,
					metrics,
				);

			weeklySummary[assigneeKey] = userWeeklySummary;

			return weeklySummary;
		},
		response.weeklySummary || {},
	);

	if (result.hasNextPage) {
		return consumeClickupPagination(response, {
			...options,
			page: result.page + 1,
		});
	}

	return response as JiraResponse;
}
