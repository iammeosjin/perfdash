import { Handlers } from '$fresh/server.ts';
import { bulkCreateUsers } from '../../controllers/user.ts';
import { User } from '../../types/common.ts';

export const handler: Handlers = {
	async POST(req) {
		const body = await req.json();

		const bulk = new URL(req.url).searchParams.get('bulk') === 'true';

		const users: User[] = !bulk ? [body as User] : body as User[];

		await bulkCreateUsers(users);

		const headers = new Headers();
		headers.set(
			'Cache-Control',
			'max-age=0, no-cache, must-revalidate, proxy-revalidate',
		);

		return new Response('OK', {
			status: 201, // See Other
			headers,
		});
	},
};
