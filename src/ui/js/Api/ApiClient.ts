import { Console, Effect } from "effect";

const refetch = (
    method: "POST" | "GET",
    url: string,
    headers: Record<string, string>,
    body: any
): Effect.Effect<string, Error> =>
    Effect.tryPromise({
        try: () =>
            fetch(url, {
                method,
                mode: "cors",
                headers: body.constructor === FormData ? headers : {
                    "Content-Type": "application/json",
                    ...headers,
                },
                credentials: "include",
                body,
            }).then(res => {
                if (res.ok) {
                    return res.text() as Promise<string>;
                }

                throw new Error(String(res.status));
            }),
        catch: e => new Error(String(e)),
    })

const fetchJson = <T>(
    method: "POST" | "GET",
    url: string,
    headers: Record<string, string>,
    body: any
) => refetch(method, url, headers, body)
    .pipe(Effect.catchAll(err => Console.error(err)))

export const post = (url: string, body: any, headers: Record<string, string> = {}) =>
    refetch("POST", url, headers, JSON.stringify(body));

export const postRaw = (url: string, body: any, headers: Record<string, string> = {}) =>
    refetch("POST", url, headers, body);

export const get = <T>(url: string, headers: Record<string, string> = {}) =>
    fetchJson<T>("GET", url, headers, undefined);
