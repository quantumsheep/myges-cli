import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, test } from "node:test";
import { GesAPI, HttpError } from "#src/ges-api.js";

const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function mockFetch(respond: () => Response | Promise<Response>) {
  calls = [];
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return respond();
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const api = new GesAPI({ token_type: "bearer", access_token: "secret" });

test("GET requests send the token and return the result", async () => {
  mockFetch(() => Response.json({ result: [2025, 2026] }));

  assert.deepEqual(await api.getYears(), [2025, 2026]);

  const [{ url, init }] = calls;
  const headers = new Headers(init.headers);
  assert.equal(url, "https://api.kordis.fr/me/years");
  assert.equal(init.method, "GET");
  assert.equal(headers.get("authorization"), "bearer secret");
  assert.equal(init.body, undefined);
});

test("POST requests send the data as JSON", async () => {
  mockFetch(() => Response.json({ result: null }));

  await api.sendProjectGroupMessage(42, "hello");

  const [{ url, init }] = calls;
  assert.equal(url, "https://api.kordis.fr/me/projectGroups/42/messages");
  assert.equal(init.method, "POST");
  assert.equal(new Headers(init.headers).get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(init.body as string), {
    projectGroupId: 42,
    message: "hello",
  });
});

test("string data is sent as-is with the given headers", async () => {
  mockFetch(() => Response.json({ result: "ok" }));

  const result = await api.request("post", "/me/x", {
    data: '{"a":1}',
    headers: { "Content-type": "application/json; charset=utf-8" },
  });

  const [{ init }] = calls;
  assert.equal(result, "ok");
  assert.equal(init.method, "POST");
  assert.equal(init.body, '{"a":1}');
  assert.equal(new Headers(init.headers).get("content-type"), "application/json; charset=utf-8");
});

test("a body is never sent with GET", async () => {
  mockFetch(() => Response.json({ result: 1 }));

  await api.request("get", "/me/x", { data: "{}" });

  assert.equal(calls[0].init.body, undefined);
});

test("non-2xx answers throw an HttpError with the response data", async () => {
  mockFetch(() => Response.json({ error: "nope" }, { status: 403 }));

  await assert.rejects(api.getProfile(), (e: unknown) => {
    assert.ok(e instanceof HttpError);
    assert.equal(e.message, "Request failed with status code 403");
    assert.deepEqual(e.response, { status: 403, data: { error: "nope" } });
    return true;
  });
});

test("network errors keep their cause in the message", async () => {
  const cause = new Error("getaddrinfo ENOTFOUND api.kordis.fr");
  mockFetch(() => {
    throw new TypeError("fetch failed", { cause });
  });

  await assert.rejects(api.getYears(), (e: unknown) => {
    assert.ok(e instanceof Error);
    assert.equal(e.message, "fetch failed: getaddrinfo ENOTFOUND api.kordis.fr");
    assert.ok(e.cause instanceof TypeError);
    return true;
  });
});

test("generateAccessToken reads the token from the redirect", async () => {
  mockFetch(
    () =>
      new Response(null, {
        status: 302,
        headers: {
          location:
            "comreseaugesskolae:/oauth2redirect#access_token=abc&token_type=bearer&expires_in=3600&scope=&uid=7",
        },
      }),
  );

  assert.deepEqual(await GesAPI.generateAccessToken("user", "pass"), {
    access_token: "abc",
    token_type: "bearer",
    expires_in: "3600",
    scope: "",
    uid: "7",
  });

  const [{ url, init }] = calls;
  assert.match(url, /^https:\/\/authentication\.kordis\.fr\/oauth\/authorize/);
  assert.equal(init.redirect, "manual");
  assert.equal(
    new Headers(init.headers).get("authorization"),
    `Basic ${Buffer.from("user:pass").toString("base64")}`,
  );
});

test("generateAccessToken fails without a redirect", async () => {
  mockFetch(() => new Response("Unauthorized", { status: 401 }));
  await assert.rejects(GesAPI.generateAccessToken("u", "p"), /Bad password/);

  mockFetch(() => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(GesAPI.generateAccessToken("u", "p"), /Bad password/);

  mockFetch(() => new Response("ok"));
  assert.equal(await GesAPI.generateAccessToken("u", "p"), null);
});

test("Node's fetch exposes the Location header with redirect: 'manual'", async () => {
  const location = "comreseaugesskolae:/oauth2redirect#access_token=abc";
  const server = http.createServer((_req, res) => {
    res.writeHead(302, { Location: location });
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      redirect: "manual",
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), location);
  } finally {
    server.close();
  }
});
