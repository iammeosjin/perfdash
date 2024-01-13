// @deno-types=npm:@types/bluebird
import Bluebird from 'npm:bluebird';
import { invoke } from './fn.ts';
import {
	type EVENT_TYPE,
	EVENTS,
	type SIGNAL_TYPE,
	SIGNALS,
	useEventListener,
	useSignalListener,
} from './listener.ts';

let gracefulShutdownCounter = 0;

export default async function gracefulShutdown(
	shutdown: (type: EVENT_TYPE | SIGNAL_TYPE) => Promise<void> | void,
) {
	const stopEventListners = await Bluebird.map(EVENTS, (type) => {
		return useEventListener(type, async function (evt: Event) {
			stop();
			gracefulShutdownCounter++;
			if (evt instanceof Event && evt?.preventDefault) {
				evt.preventDefault();
			}
			await shutdown(type);
			gracefulShutdownCounter--;
		});
	});
	const stopSignalListeners = await Bluebird.map(
		SIGNALS.filter((SIGNAL) => {
			if (SIGNAL.type === 'SIGBREAK') {
				// Linux does not support SIGBREAK
				return Deno.build.os === 'windows';
			}
			return true;
		}),
		(SIGNAL) => {
			return useSignalListener(
				SIGNAL.type,
				async function () {
					stop();
					gracefulShutdownCounter++;
					console.log('SIGNAL', SIGNAL.type);
					await shutdown(SIGNAL.type);
					gracefulShutdownCounter--;
					if (gracefulShutdownCounter === 0) {
						Deno.exit(SIGNAL.code);
					}
				},
			);
		},
	);

	function stop() {
		stopEventListners.forEach(invoke);
		stopSignalListeners.forEach(invoke);
	}

	return stop;
}
