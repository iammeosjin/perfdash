import { HandlerContext } from '$fresh/server.ts';

export const handler = async (
	_req: Request,
	_ctx: HandlerContext,
) => {
	const version = await Deno.readTextFile('./version');
	return new Response(version);
};
