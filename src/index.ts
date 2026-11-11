import { clearSheetCache, getSheet } from "./sheet";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/api/dados") return handleDados(env, ctx);
    if (request.method === "POST" && pathname === "/api/refresh") return handleRefresh(request, env);

    // Qualquer outra rota: arquivos estáticos (sua página)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleDados(env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const { data, hit } = await getSheet(env, ctx);
    return Response.json(data.items, {
      headers: {
        "X-Cache": hit ? "HIT" : "MISS",
        // cache curto no navegador, para não bater no Worker a cada F5
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    console.error("falha ao buscar planilha:", err);
    return Response.json({ error: "não foi possível carregar a planilha" }, { status: 502 });
  }
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("Authorization");
  if (!env.REFRESH_TOKEN || auth !== `Bearer ${env.REFRESH_TOKEN}`) {
    return new Response("unauthorized", { status: 401 });
  }
  await clearSheetCache(env);
  return Response.json({ ok: true });
}
