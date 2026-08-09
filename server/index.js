import { handleCapacityAssist } from './capacity-assist.js'

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/capacity-assist') return handleCapacityAssist(request, env)

    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response
    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html')
    if (!acceptsHtml) return response
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
  },
}

export default worker
