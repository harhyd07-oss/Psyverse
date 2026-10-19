import {test} from "node:test";
import assert from "node:assert/strict";
import {buildCsp} from "../middleware";

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
