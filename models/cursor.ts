// deno-lint-ignore-file no-explicit-any
import DefaultModel from '../libs/model.ts';
import { KVEntry } from '../types/common.ts';

class Model extends DefaultModel<KVEntry & { cursor: any }> {
	getPrefix() {
		return 'cursor';
	}
}

const CursorModel = new Model();

export default CursorModel;
