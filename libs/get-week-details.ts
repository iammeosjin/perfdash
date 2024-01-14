// @deno-types=npm:@types/luxon
import { DateTime } from 'npm:luxon';
import { TIMEZONE } from './constants.ts';

export default function getWeekDetails(date?: string) {
	const dt = (date ? DateTime.fromISO(date) : DateTime.now()).setZone(
		TIMEZONE,
	);
	return {
		weekNumber: dt.weekNumber,
		weekYear: dt.weekYear,
		startDateISO: dt.startOf('week').toISODate() as string,
		endDateISO: dt.endOf('week').toISODate() as string,
		year: dt.year,
	};
}
