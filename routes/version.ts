export const handler = async () => {
	const version = await Deno.readTextFile('./version');
	return new Response(version);
};
