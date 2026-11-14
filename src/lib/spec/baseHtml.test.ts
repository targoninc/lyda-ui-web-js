import {afterEach, expect, mock, test} from "bun:test";
import {baseHtml} from "../baseHtml.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.API_URL;
});

function mockProfile(user: Record<string, unknown>) {
    const fetchMock = mock(async () => new Response(JSON.stringify(user), {
        status: 200,
        headers: {"Content-Type": "application/json"},
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

test("profile links embed the display name, description and avatar", async () => {
    process.env.API_URL = "https://api.example.com";
    const fetchMock = mockProfile({
        id: 42,
        username: "loudar",
        displayname: "Loudar",
        description: "Hello & \"welcome\"",
        has_avatar: true,
    });

    const html = await baseHtml(new Request("https://lyda.test/profile/loudar"));

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/user/get", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({name: "loudar"}),
    }));
    expect(html).toContain('<meta property="og:type" content="profile"/>');
    expect(html).toContain('<meta property="og:title" content="Loudar"/>');
    expect(html).toContain('<meta property="og:description" content="Hello &amp; &quot;welcome&quot;"/>');
    expect(html).toContain("mediaFileType=userAvatar&amp;quality=500");
    expect(html).toContain('<meta property="profile:username" content="loudar">');
});

test("profiles without an avatar fall back to the default avatar", async () => {
    process.env.API_URL = "https://api.example.com";
    mockProfile({
        id: 42,
        username: "loudar",
        displayname: "Loudar",
        description: "",
        has_avatar: false,
    });

    const html = await baseHtml(new Request("https://lyda.test/user/loudar"));

    expect(html).toContain('<meta property="og:description" content="Listen to Loudar on Lyda."/>');
    expect(html).toContain("https://lyda.test/img/defaults/avatar.webp?_=");
});
