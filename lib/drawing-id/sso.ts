import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type Settings = {
  origin: string;
  supabaseUrl: string;
  publishableKey: string;
  clientId: string;
  callback: string;
  secure: boolean;
};

export function drawingIdSettings(): Settings | null {
  // Prefer server-only environment variables so a built Docker image can be configured at runtime.
  const enabled = process.env.DRAWING_SSO_ENABLED ?? process.env.NEXT_PUBLIC_DRAWING_SSO_ENABLED;
  if (enabled !== "true") return null;
  const originText = process.env.DRAWING_SSO_ORIGIN;
  const supabaseText = process.env.DRAWING_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.DRAWING_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const clientId = process.env.DRAWING_SSO_CLIENT_ID;
  if (!originText || !supabaseText || !publishableKey || !clientId) return null;

  try {
    const origin = new URL(originText);
    const project = new URL(supabaseText);
    const local = ["localhost", "127.0.0.1"].includes(origin.hostname);
    if ((origin.protocol !== "https:" && !(local && origin.protocol === "http:")) ||
      origin.pathname !== "/" || origin.search || origin.hash ||
      project.protocol !== "https:" || !project.hostname.endsWith(".supabase.co") ||
      project.pathname !== "/" || project.search || project.hash ||
      !/^[\w-]{6,256}$/.test(clientId)) return null;
    return {
      origin: origin.origin,
      supabaseUrl: project.origin,
      publishableKey,
      clientId,
      callback: new URL("/api/drawing-id/callback", origin).toString(),
      secure: origin.protocol === "https:",
    };
  } catch {
    return null;
  }
}

function privateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function pendingCookies(request: NextRequest, settings: Settings) {
  const writes: Array<(response: NextResponse) => void> = [];
  const supabase = createServerClient(settings.supabaseUrl, settings.publishableKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        for (const { name, value, options } of items) {
          writes.push(response => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: settings.secure,
              path: "/",
            });
          });
        }
      },
    },
  });
  return {
    supabase,
    apply(response: NextResponse) {
      for (const write of writes) write(response);
      return privateHeaders(response);
    },
  };
}

function oauthCookiePolicy(settings: Settings, maxAge: number) {
  return {
    httpOnly: true,
    secure: settings.secure,
    sameSite: "lax" as const,
    path: "/api/drawing-id",
    maxAge,
  };
}

function authFinish(settings: Settings, connected: boolean) {
  const target = new URL(connected ? "/?drawing_id=connected" : "/?drawing_id=failed", settings.origin);
  const response = NextResponse.redirect(target);
  response.cookies.set("drawing_chat_sso_state", "", oauthCookiePolicy(settings, 0));
  response.cookies.set("drawing_chat_sso_verifier", "", oauthCookiePolicy(settings, 0));
  return privateHeaders(response);
}

function matchesState(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === 43 && b.length === a.length && timingSafeEqual(a, b);
}

export async function startDrawingId() {
  const settings = drawingIdSettings();
  if (!settings) {
    return privateHeaders(NextResponse.json(
      { error: "Drawing ID OAuth is not configured yet." },
      { status: 503 },
    ));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authUrl = new URL("/auth/v1/oauth/authorize", settings.supabaseUrl);
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: settings.clientId,
    redirect_uri: settings.callback,
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("drawing_chat_sso_state", state, oauthCookiePolicy(settings, 600));
  response.cookies.set("drawing_chat_sso_verifier", verifier, oauthCookiePolicy(settings, 600));
  return privateHeaders(response);
}

export async function finishDrawingId(request: NextRequest) {
  const settings = drawingIdSettings();
  if (!settings) {
    return privateHeaders(NextResponse.json(
      { error: "Drawing ID OAuth is not configured yet." },
      { status: 503 },
    ));
  }

  const params = request.nextUrl.searchParams;
  const state = request.cookies.get("drawing_chat_sso_state")?.value ?? "";
  const verifier = request.cookies.get("drawing_chat_sso_verifier")?.value ?? "";
  const suppliedState = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (params.has("error") || !matchesState(state, suppliedState) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(verifier) || !code || code.length > 4096) {
    return authFinish(settings, false);
  }

  try {
    const tokenResponse = await fetch(new URL("/auth/v1/oauth/token", settings.supabaseUrl), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: settings.clientId,
        redirect_uri: settings.callback,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenResponse.ok) return authFinish(settings, false);
    const tokenJson: unknown = await tokenResponse.json();
    if (!tokenJson || typeof tokenJson !== "object" ||
      !("access_token" in tokenJson) || typeof tokenJson.access_token !== "string" ||
      !("refresh_token" in tokenJson) || typeof tokenJson.refresh_token !== "string") {
      return authFinish(settings, false);
    }

    const session = pendingCookies(request, settings);
    const { error } = await session.supabase.auth.setSession({
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
    });
    if (error) return authFinish(settings, false);

    // Server-side verification, not a claim or an email parameter from the URL.
    const { data: { user }, error: userError } = await session.supabase.auth.getUser();
    if (userError || !user) return authFinish(settings, false);

    return session.apply(authFinish(settings, true));
  } catch {
    return authFinish(settings, false);
  }
}

function publicDisplayName(metadata: Record<string, unknown>) {
  const candidates = [metadata.display_name, metadata.username, metadata.full_name, metadata.name];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 60);
  }
  return "Drawing 사용자";
}

export async function getDrawingIdStatus(request: NextRequest) {
  const settings = drawingIdSettings();
  if (!settings) {
    return privateHeaders(NextResponse.json({ configured: false, user: null }));
  }
  try {
    const session = pendingCookies(request, settings);
    const { data: { user }, error } = await session.supabase.auth.getUser();
    const profile = !error && user ? {
      id: user.id,
      displayName: publicDisplayName(user.user_metadata ?? {}),
    } : null;
    return session.apply(NextResponse.json({ configured: true, user: profile }));
  } catch {
    return privateHeaders(NextResponse.json(
      { configured: true, user: null, error: "Unable to verify session" },
      { status: 503 },
    ));
  }
}

export async function signOutDrawingId(request: NextRequest) {
  const settings = drawingIdSettings();
  if (!settings) return privateHeaders(NextResponse.json({ error: "Not configured" }, { status: 503 }));

  // Prevent cross-origin form posts from silently logging a user out.
  if (request.headers.get("origin") !== settings.origin) {
    return privateHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const session = pendingCookies(request, settings);
    const { error } = await session.supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    return session.apply(NextResponse.json({ ok: true }));
  } catch {
    return privateHeaders(NextResponse.json({ error: "Logout failed" }, { status: 503 }));
  }
}
