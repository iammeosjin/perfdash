import mergeWith from 'https://deno.land/x/ramda@v0.27.2/source/mergeWith.js';
import add from 'https://deno.land/x/ramda@v0.27.2/source/add.js';
import reduce from 'https://deno.land/x/ramda@v0.27.2/source/reduce.js';

export default function reduceAndMerge(
	objs: Record<string, unknown>[],
) {
	return reduce(mergeWith(add), {})(objs);
}
