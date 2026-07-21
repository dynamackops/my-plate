import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function sitesOutput(): Plugin {
  return {
    name: 'my-plate-sites-output',
    apply: 'build',
    async closeBundle() {
      const dist = resolve('dist')
      const metadata = resolve(dist, '.openai')
      const server = resolve(dist, 'server')
      await rm(resolve(dist, 'assets'), { recursive: true, force: true })
      await rm(resolve(dist, 'index.html'), { force: true })
      await rm(metadata, { recursive: true, force: true })
      await mkdir(metadata, { recursive: true })
      await mkdir(server, { recursive: true })
      try {
        await cp(resolve('.openai', 'hosting.json'), resolve(metadata, 'hosting.json'))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      await writeFile(resolve(server, 'index.js'), `
const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;
    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (!acceptsHtml) return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
export default worker;
`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitesOutput()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
})
