interface Env {
  API: Fetcher
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      url.pathname = url.pathname.replace(/^\/api/, "") || "/"
      return env.API.fetch(new Request(url.toString(), request))
    }
    return env.ASSETS.fetch(request)
  }
} satisfies ExportedHandler<Env>
