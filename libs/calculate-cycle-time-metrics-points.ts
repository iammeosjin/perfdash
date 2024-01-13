import { CycleTimeMetrics } from '../types/common.ts';

export default function calculateCycleTimeMetricsPoints(
	value: number,
	metrics: CycleTimeMetrics[],
) {
	const pointMetric = metrics.find((metric) =>
		value >= metric.min &&
		value <= metric.max
	);
	if (!pointMetric) return 1;
	return pointMetric.points;
}
