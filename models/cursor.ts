import DefaultModel from '../libs/model.ts';
import { KVEntry } from '../types/common.ts';

class Model extends DefaultModel<KVEntry & { cursor: string }> {
	getPrefix() {
		return 'cursor';
	}
}

const CursorModel = new Model();

export default CursorModel;
