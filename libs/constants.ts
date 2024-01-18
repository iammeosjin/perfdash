import { CycleTimeMetrics, Team } from '../types/common.ts';
import { TaskType } from '../types/task.ts';

export const TIMEZONE = 'Asia/Manila';

export const DEFAULT_IMAGE = '/images/user.png';

export const TASK_TYPE_COLOR_MAP = {
	[TaskType.EPIC]: 'purple-500',
	[TaskType.BUG]: 'red-500',
	[TaskType.TASK]: 'blue-400',
	[TaskType.STORY]: 'green-600',
	[TaskType.DEFECT]: 'yellow-500',
	[TaskType.SUBTASK]: 'blue-400',
} as Record<TaskType, string>;

export const GITHUB_REPOSITORIES = {
	[Team.OPEXA]: {
		owner: 'HighOutputVentures',
		repo: 'opexa',
	},
	[Team.NEXIUX]: {
		owner: 'layer2consulting',
		repo: 'onewallet_monorepo',
	},
};

function prltMetrics(points: number[]): CycleTimeMetrics[] {
	return [
		{
			min: 0,
			max: 60 * 15,
		},
		{
			min: 60 * 15,
			max: 60 * 30,
		},
		{
			min: 60 * 30,
			max: 3600,
		},
		{
			min: 3600,
			max: 3600 * 12,
		},
		{
			min: 3600 * 12,
			max: 3600 * 24,
		},
	].map((range, index) => {
		return { ...range, points: points[index] };
	});
}

function tctMetrics(points: number[]): CycleTimeMetrics[] {
	return [
		{
			min: 0,
			max: 3600,
		},
		{
			min: 3600,
			max: 3600 * 3,
		},
		{
			min: 3600 * 3,
			max: 3600 * 12,
		},
		{
			min: 3600 * 12,
			max: 3600 * 24,
		},
		{
			min: 86400,
			max: 86400 * 2,
		},
	].map((range, index) => {
		return { ...range, points: points[index] };
	});
}

/**
 * Scoring Metrics for Junior and Senior Developers.
 * @param FPRR - First Pull Request Reviewed
 * @param PRR - Pull Request Reviewed
 * @param PRC - Pull Request Created
 * @param PRLT - Pull Request Lead Time
 * @param BDC - Bugs Done Count
 * @param SDC - Stories Done Count
 * @param DDC - Defects Done Count
 * @param TDC - Tasks Done Count
 * @param TCT - Task Cycle Time
 */
export const SCORE_METRICS = {
	JUNIORS: {
		FPRR: 40,
		PRR: 10,
		PRC: 10,
		PRLT: prltMetrics([10, 8, 6, 4, 2]),
		BDC: {
			MAX: 40,
			MIN: 10,
		},
		SDC: {
			MAX: 40,
			MIN: 10,
		},
		STDC: 50,
		STCT: tctMetrics([10, 8, 6, 4, 2]),
	},
	SENIORS: {
		FPRR: 40,
		PRR: 25,
		PRC: 10,
		PRLT: prltMetrics([10, 8, 6, 4, 2]),
		BDC: {
			MAX: 15,
			MIN: 1,
		},
		SDC: {
			MAX: 15,
			MIN: 1,
		},
		STDC: 20,
		STCT: tctMetrics([10, 8, 6, 4, 2]),
	},
};
