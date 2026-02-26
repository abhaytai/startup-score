import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function apiProxy() {
  let apiKey
  return {
    name: 'api-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      apiKey = env.ANTHROPIC_API_KEY
    },
    configureServer(server) {
      server.middlewares.use('/api/claude', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set. Create a .env file with your key.' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        const { model, max_tokens, messages, tools } = JSON.parse(body)

        const payload = {
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: max_tokens || 1000,
          messages,
        }
        if (tools) payload.tools = tools

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(payload),
          })

          const data = await response.json()
          res.statusCode = response.ok ? 200 : response.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to call Anthropic API' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiProxy()],
})
