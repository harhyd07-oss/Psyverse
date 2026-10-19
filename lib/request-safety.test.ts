import {test} from "node:test";
import assert from "node:assert/strict";
import {allowRequest,expectedOrigin,readLimitedJson} from "./request-safety";

test("throttle rejects requests after its configured limit",()=>{
 const key="test-"+Math.random();
 assert.equal(allowRequest(key,2,60000),true);
 assert.equal(allowRequest(key,2,60000),true);
 assert.equal(allowRequest(key,2,60000),false);
});

test("state-changing request origin must match the app origin",()=>{
 assert.equal(expectedOrigin(new Request("https://site.example/api",{method:"POST",headers:{origin:"https://site.example"}})),true);
 assert.equal(expectedOrigin(new Request("https://site.example/api",{method:"POST",headers:{origin:"https://elsewhere.example"}})),false);
});

test("same-origin checks use the incoming host when the request URL is normalized",()=>{
 const request=new Request("http://localhost:3100/api/register",{method:"POST",headers:{origin:"http://127.0.0.1:3100",host:"127.0.0.1:3100"}});
 assert.equal(expectedOrigin(request),true);
});

test("same-origin checks honor the forwarded HTTPS protocol and reject other origins",()=>{
 const headers={origin:"https://site.example",host:"site.example","x-forwarded-proto":"https"};
 assert.equal(expectedOrigin(new Request("http://localhost/api/register",{method:"POST",headers})),true);
 assert.equal(expectedOrigin(new Request("http://localhost/api/register",{method:"POST",headers:{...headers,origin:"https://elsewhere.example"}})),false);
});

test("bounded JSON reader rejects oversized and malformed bodies",async()=>{
 assert.equal(await readLimitedJson(new Request("https://site.example",{method:"POST",body:JSON.stringify({message:"12345"})}),8),null);
 assert.equal(await readLimitedJson(new Request("https://site.example",{method:"POST",body:"{"})),null);
 assert.deepEqual(await readLimitedJson(new Request("https://site.example",{method:"POST",body:"{\"ok\":true}"})),{ok:true});
});
