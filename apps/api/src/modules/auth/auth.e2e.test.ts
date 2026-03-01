import { describe, it, expect } from "vitest";
import { setupE2ETest, getApp, authHeaders, createTestUser } from "../../test/e2e-setup.js";

setupE2ETest();

describe("GET /api/v1/users/me", () => {
  it("returns private profile when authenticated", async () => {
    const user = await createTestUser({ username: "meuser" });
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers,
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.username).toBe("meuser");
    expect(body).toHaveProperty("email");
    expect(body).toHaveProperty("skillCount");
    expect(body).toHaveProperty("totalInstalls");
  });

  it("returns 401 without auth", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/me",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/me",
      headers: { authorization: "Bearer invalid-token-value" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("PATCH /api/v1/users/me", () => {
  it("updates profile fields", async () => {
    const user = await createTestUser({ username: "patchuser" });
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      headers,
      payload: {
        displayName: "Updated Display Name",
        bio: "A short bio about me",
      },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.displayName).toBe("Updated Display Name");
    expect(body.bio).toBe("A short bio about me");
  });

  it("returns 401 without auth", async () => {
    const res = await getApp().inject({
      method: "PATCH",
      url: "/api/v1/users/me",
      payload: { displayName: "Hacked" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/v1/users/:username", () => {
  it("returns public profile", async () => {
    await createTestUser({ username: "publicuser" });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/publicuser",
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.username).toBe("publicuser");
    expect(body).not.toHaveProperty("email");
    expect(body).toHaveProperty("skillCount");
  });

  it("returns 404 for nonexistent user", async () => {
    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/does-not-exist-user",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/v1/users/me/api-keys", () => {
  it("creates an API key", async () => {
    const user = await createTestUser({ username: "apikeyuser" });
    const headers = await authHeaders(user.id, user.username);

    const res = await getApp().inject({
      method: "POST",
      url: "/api/v1/users/me/api-keys",
      headers,
      payload: { name: "Test Key" },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.name).toBe("Test Key");
    expect(body.key).toMatch(/^sh_/);
    expect(body).toHaveProperty("keyPrefix");
  });

  it("returns 401 without auth", async () => {
    const res = await getApp().inject({
      method: "POST",
      url: "/api/v1/users/me/api-keys",
      payload: { name: "Unauthorized Key" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/v1/users/me/api-keys", () => {
  it("lists API keys without exposing full key", async () => {
    const user = await createTestUser({ username: "listkeysuser" });
    const headers = await authHeaders(user.id, user.username);

    // Create a key first
    await getApp().inject({
      method: "POST",
      url: "/api/v1/users/me/api-keys",
      headers,
      payload: { name: "Listed Key" },
    });

    const res = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/me/api-keys",
      headers,
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0]).toHaveProperty("keyPrefix");
    expect(body[0]).not.toHaveProperty("key");
  });
});

describe("DELETE /api/v1/users/me/api-keys/:id", () => {
  it("deletes an API key", async () => {
    const user = await createTestUser({ username: "delkeyuser" });
    const headers = await authHeaders(user.id, user.username);

    // Create a key
    const createRes = await getApp().inject({
      method: "POST",
      url: "/api/v1/users/me/api-keys",
      headers,
      payload: { name: "To Delete" },
    });
    const keyId = createRes.json().id;

    // Delete it
    const res = await getApp().inject({
      method: "DELETE",
      url: `/api/v1/users/me/api-keys/${keyId}`,
      headers,
    });
    expect(res.statusCode).toBe(200);

    // Verify it's gone
    const listRes = await getApp().inject({
      method: "GET",
      url: "/api/v1/users/me/api-keys",
      headers,
    });
    const keys = listRes.json();
    expect(keys.find((k: { id: string }) => k.id === keyId)).toBeUndefined();
  });
});
