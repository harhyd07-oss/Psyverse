import {NextRequest} from "next/server";
import {test} from "node:test";
import assert from "node:assert/strict";
import {buildCsp,middleware} from "../middleware";

test("development CSP supports the Next.js dev overlay inline styles",()=>{
 const csp=buildCsp("test-nonce","development");
 assert.match(csp,/style-src 'self' 'unsafe-inline'/);
 assert.match(csp,/script-src[^;]*'unsafe-eval'/);
 assert.doesNotMatch(csp,/style-src[^;]*'nonce-/);
});

test("production CSP keeps nonce styles and excludes unsafe inline and eval",()=>{
 const csp=buildCsp("test-nonce","production");
 assert.match(csp,/style-src 'self' 'nonce-[^']+'/);
 assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval/);
 assert.match(csp,/script-src[^;]*'nonce-/);
});

test("middleware forwards the CSP and matching nonce to the App Router",()=>{
 const response=middleware(new NextRequest("https://example.test/"));
 const csp=response.headers.get("content-security-policy");
 const nonce=response.headers.get("x-middleware-request-x-nonce");
 const forwardedCsp=response.headers.get("x-middleware-request-content-security-policy");

 assert.ok(nonce);
 assert.equal(forwardedCsp,csp);
 assert.ok(csp?.includes(`'nonce-${nonce}'`));
});
