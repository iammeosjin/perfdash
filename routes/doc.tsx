import { Handlers } from '$fresh/server.ts';
import { CSS, render } from '$gfm';

interface Page {
	markdown: string;
	data: Record<string, unknown>;
}

export const handler: Handlers = {
	async GET(_) {
		const content = await Deno.readTextFile('./README.md');

		const body = render(content);
		const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          background-color: var(--color-canvas-default);
          color: var(--color-fg-default);
        }
        main {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        ${CSS}
      </style>
    </head>
    <body data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
      <main class="markdown-body">
        ${body}
      </main>
    </body>
  </html>`;
		return new Response(html, {
			headers: {
				'content-type': 'text/html;charset=utf-8',
			},
		});
	},
};
