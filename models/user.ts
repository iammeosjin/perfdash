import DefaultModel from '../libs/model.ts';
import { User } from '../types/common.ts';

class Model extends DefaultModel<User> {
	getPrefix() {
		return 'user';
	}
}

const UserModel = new Model();

export default UserModel;
