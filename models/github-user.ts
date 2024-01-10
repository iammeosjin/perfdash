import DefaultModel from '../libs/model.ts';
import { IntegrationUser } from '../types/common.ts';

class Model extends DefaultModel<IntegrationUser> {
	getPrefix() {
		return 'github-user';
	}
}

const GithubUserModel = new Model();

export default GithubUserModel;
