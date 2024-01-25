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
import {
	ClickupRequestOption,
	Task,
	TaskStatus,
	TaskType,
} from '../types/task.ts';
import reduceAndMerge from './reduce-and-merge.ts';
import { ClickupAPI } from '../apis/clickup.ts';
import TaskModel from '../models/task.ts';

type JiraResponse = {
	weeklySummary: Record<
		string,
		{ user: ID; tasksCreated: string[] } & TaskCycleSummary
	>;
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

			const taskCycle = taskCycles[task.key];
			let dateTimeMovedToInprogress: string | undefined;
			if (taskCycle) {
				dateTimeMovedToInprogress = new Date(+taskCycle.since)
					.toISOString();
			}

			let dateTimeMovedToDone: string | undefined;

			if (task.dateDone) {
				dateTimeMovedToDone = new Date(+task.dateDone).toISOString();
			}

			const input: Omit<Task, 'pullRequests' | 'subTasks'> = {
				key: task.key,
				type,
				status,
				customId: task.customId,
				summary: task.summary,
				link: task.url,
				assignee: task.assignee,
				reporter: task.creator,
				parent: task.parent ? { key: task.parent } : undefined,
				dateTimeCreated: new Date(+task.dateCreated).toISOString(),
				dateTimeMovedToDone,
				dateTimeMovedToInprogress,
				id: [options.team, task.key],
			};
			let startProcess = Date.now();
			if (
				await TaskModel.hasProcessTask({
					key: task.key,
					team: options.team,
					status: status,
				})
			) {
				return weeklySummary;
			}

			await TaskModel.enqueue(input);

			if (input.parent) {
				await TaskModel.enqueue({
					subTasks: [input.id],
					key: input.parent.key,
					id: [options.team, input.parent.key],
				});
			}

			console.log(Date.now() - startProcess, 'ms', 'enqueue', input.id);

			if (
				![
					TaskType.BUG,
					TaskType.STORY,
					TaskType.DEFECT,
					TaskType.TASK,
					TaskType.SUBTASK,
					TaskType.EPIC,
				].includes(type)
			) {
				return weeklySummary;
			}

			startProcess = Date.now();
			const reporter = await getUserByClickupHandle(task.creator.id);
			console.log(Date.now() - startProcess, 'ms', 'get reporter');

			const startOfWeek = DateTime.fromMillis(
				+(task.dateDone || task.dateUpdated),
			).startOf(
				'week',
			).setZone(
				TIMEZONE,
			).toISO() as string;

			if (reporter) {
				const reporterKey = [
					startOfWeek,
					task.creator.id,
				].join(';');

				const userWeeklySummary = weeklySummary[reporterKey] || {};

				userWeeklySummary.user = reporter ? reporter.id : [];
				userWeeklySummary.tasksCreated = [
					...userWeeklySummary.tasksCreated || [],
					task.key,
				];

				weeklySummary[reporterKey] = userWeeklySummary;
			}

			if (status !== TaskStatus.DONE) {
				return weeklySummary;
			}

			if (!task.assignee) {
				return weeklySummary;
			}

			startProcess = Date.now();
			const assignee = await getUserByClickupHandle(task.assignee.id);
			console.log(Date.now() - startProcess, 'ms', 'get assignee');

			if (!assignee) {
				return weeklySummary;
			}

			let taskCycleSummaryType = TaskCycleSummaryType.TASK;

			if (type === TaskType.STORY) {
				taskCycleSummaryType = TaskCycleSummaryType.STORY;
			} else if (type === TaskType.BUG) {
				taskCycleSummaryType = TaskCycleSummaryType.BUG;
			} else if (type === TaskType.EPIC) {
				taskCycleSummaryType = TaskCycleSummaryType.EPIC;
			}

			const assigneeKey = [
				startOfWeek,
				task.assignee.id,
				taskCycleSummaryType,
			].join(';');

			startProcess = Date.now();
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
			const cycleTime = (taskCycle?.cycleTime || 0) * 60;

			userWeeklySummary.taskDoneCount += 1;
			userWeeklySummary.taskDoneCycleTime += cycleTime;

			if (
				userWeeklySummary.type === TaskCycleSummaryType.STORY ||
				userWeeklySummary.type === TaskCycleSummaryType.EPIC
			) {
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
			console.log(Date.now() - startProcess, 'ms', 'reduce and merge');

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
