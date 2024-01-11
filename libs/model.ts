import { ID, KVEntry } from '../types/common.ts';
import KV from './kv.ts';

export default class DefaultModel<T> {
	get kv() {
		return KV;
	}

	getPrefix() {
		return 'default';
	}

	async get(key: string[]) {
		const { value } = await KV.get([this.getPrefix(), ...key]);
		return value as T | null;
	}

	async delete(key: string[]) {
		await KV.delete([this.getPrefix(), ...key]);
		return true;
	}

	async insert(input: KVEntry & T) {
		const key = [this.getPrefix(), ...input.id];
		await KV.set(key, input);
		return true;
	}

	async list(params?: { prefix: ID }) {
		const filter = { prefix: [this.getPrefix()] };
		if (params?.prefix) {
			filter.prefix.push(...params.prefix);
		}
		const entries: (KVEntry & T)[] = [];
		for await (
			const entry of KV.list<KVEntry & T>(filter)
		) {
			entries.push(entry.value);
		}
		return entries;
	}
}
