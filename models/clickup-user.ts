import DefaultModel from '../libs/model.ts';
import { IntegrationUser } from '../types/common.ts';

class Model extends DefaultModel<IntegrationUser> {
	getPrefix() {
		return 'clickup-user';
	}
}

const ClickupUserModel = new Model();

export default ClickupUserModel;
