import DefaultModel from '../libs/model.ts';
import { User } from '../types/common.ts';

class Model extends DefaultModel<User> {
	getPrefix() {
		return 'weekly-points';
	}
}

const WeeklyPointsModel = new Model();

export default WeeklyPointsModel;
