// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import { getUserByJiraHandle } from '../controllers/user.ts';
import calculateCycleTimeMetricsPoints from './calculate-cycle-time-metrics-points.ts';
import {
	ID,
	TaskCycleSummary,
	TaskCycleSummaryType,
	Team,
} from '../types/common.ts';
import { SCORE_METRICS, TIMEZONE } from './constants.ts';
import TaskModel from '../models/task.ts';
import { JiraAPI } from '../apis/jira.ts';
import omit from 'https://deno.land/x/ramda@v0.27.2/source/omit.js';
import {
	JiraRequestOptions,
	JiraStatus,
	Task,
	TaskType,
} from '../types/task.ts';
import reduceAndMerge from './reduce-and-merge.ts';

type JiraResponse = {
	weeklySummary: Record<string, { user: ID } & TaskCycleSummary>;
};

export default async function consumeJiraPagination(
	response: JiraResponse,
	options: {
		team: Team.NEXIUX;
		cursor: string;
	} & Partial<JiraRequestOptions>,
) {
	const result = await JiraAPI.getIssues(
		{ cursor: options.cursor },
		omit(['team', 'repository', 'cursor'])(options),
	);

	const startAt = result.startAt + result.maxResults;
	let refetch = true;
	await Bluebird.reduce(
		result
			.issues,
		async (weeklySummary, issue) => {
			const debug = false;

			const input: Omit<Task, 'pullRequests' | 'subTasks'> = {
				key: issue.key,
				summary: issue.summary,
				link: `https://identifi.atlassian.net/browse/${issue.key}`,
				type: JiraAPI.parseType(issue.type),
				status: JiraAPI.parseStatus(issue.status),
				assignee: issue.assignee,
				reporter: issue.reporter,
				parent: issue.parent
					? {
						key: issue.parent.key,
						type: JiraAPI.parseType(issue.parent.type),
						status: JiraAPI.parseStatus(issue.parent.status),
					}
					: undefined,
				hasSubTasks: issue.hasSubtask,
				dateTimeCreated: issue.created,
				dateTimeMovedToInprogress: issue.movedToInProgress,
				dateTimeMovedToDone: issue.statusCategoryChangeDate,
				id: [options.team, issue.key],
			};

			if (
				await TaskModel.hasProcessTask({
					key: input.key,
					team: options.team,
					status: input.status,
				})
			) {
				return weeklySummary;
			}

			await TaskModel.enqueue(input);

			if (issue.hasSubtask) {
				const subTasks = await Bluebird.map(
					issue.subTasks,
					async (subTask) => {
						await TaskModel.enqueue({
							type: JiraAPI.parseType(subTask.type),
							status: JiraAPI.parseStatus(subTask.status),
							parent: input.parent,
							key: subTask.key,
							id: [options.team, subTask.key],
						});

						return [options.team, subTask.key];
					},
				);

				await TaskModel.enqueue({
					subTasks,
					key: input.key,
					id: input.id,
				});
			} else if (issue.parent?.key) {
				await TaskModel.enqueue({
					subTasks: [input.id],
					key: issue.parent.key,
					id: [options.team, issue.parent.key],
				});
			}

			if (
				![
					TaskType.BUG,
					TaskType.STORY,
					TaskType.DEFECT,
					TaskType.TASK,
					TaskType.SUBTASK,
				].includes(input.type)
			) {
				return weeklySummary;
			}

			if (issue.status !== JiraStatus.DONE) {
				return weeklySummary;
			}

			if (!issue.assignee) {
				return weeklySummary;
			}

			const assignee = await getUserByJiraHandle(issue.assignee.id);

			if (!assignee) {
				return weeklySummary;
			}

			const dateTimeMovedToInprogress = DateTime.fromISO(
				issue.movedToInProgress || issue.created,
			);

			const dateTimeMovedToDone = DateTime.fromISO(
				issue.statusCategoryChangeDate,
			);

			const cycleTime =
				dateTimeMovedToDone.diff(dateTimeMovedToInprogress, 'seconds')
					.seconds;

			const startOfWeek = dateTimeMovedToDone.startOf('week').setZone(
				TIMEZONE,
			).toISO() as string;

			let taskCycleSummaryType = TaskCycleSummaryType.TASK;

			if (input.type === TaskType.STORY) {
				taskCycleSummaryType = TaskCycleSummaryType.STORY;
			} else if (input.type === TaskType.BUG) {
				taskCycleSummaryType = TaskCycleSummaryType.BUG;
			} else if (input.type === TaskType.TASK) {
				taskCycleSummaryType = input.hasSubTasks
					? TaskCycleSummaryType.STORY
					: TaskCycleSummaryType.TASK;
			}

			const assigneeKey = [
				startOfWeek,
				issue.assignee.id,
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

			userWeeklySummary.taskDoneCount += 1;
			userWeeklySummary.taskDoneCycleTime += cycleTime;

			if (userWeeklySummary.type === TaskCycleSummaryType.STORY) {
				userWeeklySummary.taskCyclePoints += assignee.level === 1
					? SCORE_METRICS.JUNIORS.SDC.MAX
					: SCORE_METRICS.SENIORS.SDC.MAX;
			} else if (userWeeklySummary.type === TaskCycleSummaryType.BUG) {
				let taskCyclePoints = assignee.level === 1
					? SCORE_METRICS.JUNIORS.BDC.MIN
					: SCORE_METRICS.SENIORS.BDC.MIN;

				if (issue.hasSubtask) {
					taskCyclePoints = assignee.level === 1
						? SCORE_METRICS.JUNIORS.BDC.MAX
						: SCORE_METRICS.SENIORS.BDC.MAX;
				}

				userWeeklySummary.taskCyclePoints += taskCyclePoints;
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

			if (debug) {
				console.log(userWeeklySummary);
			}

			return weeklySummary;
		},
		response.weeklySummary || {},
	);

	if (refetch) {
		refetch = startAt < result.total;
	}

	if (refetch) {
		return consumeJiraPagination(response, {
			...options,
			startAt,
		});
	}

	return response as JiraResponse;
}
