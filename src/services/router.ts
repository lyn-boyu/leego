// Router type definitions
export type RouteHandler = (req: Request, params?: Record<string, string>) => Promise<Response>;
type Route = {
  pattern: RegExp;
  methods: Record<string, RouteHandler>;
};

// Response helper functions
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export function html(content: string): Response {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export function asset(content: Buffer, type: string): Response {
  return new Response(content, {
    headers: {
      "Content-Type": type,
      "Access-Control-Allow-Origin": "*"
    }
  });
}

class Router {
  private static instance: Router;
  private routes: Route[] = [];

  private fallbackHandler: RouteHandler = async () => json({ error: 'Not Found' }, 404);
  private spaHandler: RouteHandler = async () => json({ error: 'Not Found' }, 404);

  private constructor(
    fallbackHandler: RouteHandler = async () => json({ error: 'Not Found' }, 404)
  ) {
    this.fallbackHandler = fallbackHandler
  }

  static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  add(pattern: RegExp, methods: Record<string, RouteHandler>) {
    this.routes.push({ pattern, methods });
    return this;
  }

  setSpaFallback(handler: RouteHandler) {
    this.spaHandler = handler;
  }

  isSpaRoute(url: URL): boolean {
    return (
      !url.pathname.startsWith('/api') &&
      !url.pathname.startsWith('/assets') &&
      !url.pathname.includes('.')
    )
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }



    for (const route of this.routes) {
      const match = url.pathname.match(route.pattern);
      if (match) {
        const handler = route.methods[method];
        if (handler) {
          const params = match.groups || {};
          return await handler(req, params);
        }
      }
    }

    if (this.isSpaRoute(url)) {
      return this.spaHandler(req);
    }

    return this.fallbackHandler(req);
  }
}

export const router = Router.getInstance();