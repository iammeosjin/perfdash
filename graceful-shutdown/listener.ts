/**
 * Signal in a generic environment
 */
export const SIGNALS = [{
	code: 21,
	type: 'SIGBREAK',
}, {
	code: 130,
	type: 'SIGINT',
}] as const;

/**
 * Global event types, currently only error and unload
 */
export const EVENTS = [
	'error',
	'unhandledrejection',
	'beforeunload',
	'unload',
] as const;

export type EVENT_TYPE = (typeof EVENTS)[number];

export type SIGNAL_TYPE = (typeof SIGNALS)[number]['type'];

/**
 * use global event listener
 * @param args
 * @returns
 * @example
 * ```ts
 * import { useEventListener } from "https://deno.land/x/easy_std@version/src/listener.ts";
 *
 * const stop = useEventListener('unload', () => {})
 *
 * stop() // remove listener
 * ```
 */
export function useEventListener(...args: Parameters<typeof addEventListener>) {
	const [type, listener, options] = args;
	globalThis.addEventListener(type, listener, options);

	return function stop() {
		globalThis.removeEventListener(type, listener, options);
	};
}

/**
 * use deno signal listener
 * @param signal
 * @param handler
 * @returns
 * @example
 * ```ts
 * import { useSignalListener } from "https://deno.land/x/easy_std@version/src/listener.ts";
 *
 * const stop = useSignalListener('SIGINT', () => {})
 *
 * stop() // remove listener
 * ```
 */
export function useSignalListener(signal: Deno.Signal, handler: () => void) {
	Deno.addSignalListener(signal, handler);
	return function stop() {
		Deno.removeSignalListener(signal, handler);
	};
}
