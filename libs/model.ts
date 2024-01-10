import { KVEntry } from '../types/common.ts';
import KV from './kv.ts';

export default class DefaultModel<T> {
	getPrefix() {
		return 'default';
	}

	async get(...key: string[]) {
		const { value } = await KV.get([this.getPrefix(), ...key]);
		return value as T | null;
	}

	async insert(input: KVEntry & T) {
		const key = [this.getPrefix(), ...input.id];
		await KV.set(key, input);
		return true;
	}

	async list() {
		const filter = { prefix: [this.getPrefix()] };
		const entries: (KVEntry & T)[] = [];
		for await (
			const entry of KV.list<KVEntry & T>(filter)
		) {
			entries.push(entry.value);
		}
		return entries;
	}
}
