import DefaultModel from '../libs/model.ts';
import { IntegrationUser } from '../types/common.ts';

class Model extends DefaultModel<IntegrationUser> {
	getPrefix() {
		return 'jira-user';
	}
}

const JiraUserModel = new Model();

export default JiraUserModel;
