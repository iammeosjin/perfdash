/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import '$std/dotenv/load.ts';

import { start } from '$fresh/server.ts';
import manifest from './fresh.gen.ts';
import config from './fresh.config.ts';
import { hourly } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';
import updateSummaries from './jobs/update-summaries.ts';

hourly(() => updateSummaries());

await start(manifest, config);
