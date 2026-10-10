import { defineConfig } from '@hey-api/openapi-ts'

// `npm run gen:api` at the repository root writes openapi.json from the FastAPI app (no server needed) and regenerates lib/client.
export default defineConfig({
  input: 'openapi.json',
  output: 'lib/client',
  // No base URL: requests stay same-origin and next.config.ts rewrites /api to FastAPI.
  plugins: [{ name: '@hey-api/client-fetch', baseUrl: false }],
})
