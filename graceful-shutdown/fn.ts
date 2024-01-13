import { AnyFunction } from './type.ts';

/**
 * Calling function parameters directly
 * @param fn
 * @returns
 * @example
 * ```ts
 * import { invoke } from "https://deno.land/x/easy_std@version/src/fn.ts"
 *
 * const fns = [() => 1, () => 2]
 *
 * fns.map(invoke) // [1, 2]
 * ```
 */
export function invoke<T>(fn: () => T): T {
	return fn();
}

/**
 * Any function will only be called once
 * @param fn
 * @returns
 * @example
 * ```ts
 * import { useOnce } from "https://deno.land/x/easy_std@version/src/fn.ts"
 *
 * let foo = 0
 *
 * const once = useOnce(() => foo += 1)
 *
 * once()
 * once()
 *
 * foo // 1
 * ```
 */
export function useOnce<T extends AnyFunction>(fn: T) {
	let resolved = false;
	let result: unknown;
	return function once(
		this: ThisType<T>,
		...rest: Parameters<T>
	): ReturnType<T> {
		if (!resolved) {
			resolved = true;
			return result = fn.apply(this, rest);
		}

		return result as ReturnType<T>;
	};
}

/**
 * Any function will only be called once
 * @param count
 * @returns
 * @example
 * ```ts
 * import { useCount } from "https://deno.land/x/easy_std@version/src/fn.ts"
 *
 * const count = useCount()
 *
 * count() // 0
 * count() // 1
 * count() // 2
 *
 * count(100) // 100
 * ```
 */
export function useCount(count = 0) {
	return function (newCount?: number) {
		if (newCount !== undefined) {
			count = newCount;
			return count;
		}
		return count++;
	};
}
