import DefaultModel from '../libs/model.ts';
import { ID, Team, UserWeeklySummary } from '../types/common.ts';

class Model extends DefaultModel<UserWeeklySummary> {
	getPrefix() {
		return 'user-weekly-summary';
	}

	generateId(params: {
		team: Team;
		year: number;
		month: number;
		weekNumber: number;
		user: ID;
	}): ID {
		return [
			params.team,
			params.year,
			params.month,
			params.weekNumber,
			...params.user,
		].map((index) => index.toString());
	}
}

const UserWeeklySummaryModel = new Model();

export default UserWeeklySummaryModel;
