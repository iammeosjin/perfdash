import { SCORE_METRICS } from '../libs/constants.ts';

let doc = await Deno.readTextFile('./docs/template.md');

const version = await Deno.readTextFile('./version');

doc = doc.replaceAll(/\{PROJECT_VERSION\}/gm, `v${version}`);

Object.entries(SCORE_METRICS).forEach(([level, metrics]) => {
	const key = level.charAt(0);
	Object.entries(metrics).forEach(([metric, value]) => {
		if (typeof value === 'object') {
			Object.entries(value).forEach(([subMetric, subValue]) => {
				doc = doc.replaceAll(
					`{${key}${metric}${subMetric}}`,
					`${subValue}`,
				);
			});
			return;
		}
		doc = doc.replaceAll(`{${key}${metric}}`, `${value}`);
	});
});

await Deno.writeTextFile('./README.md', doc);
