import {test} from "node:test";
import assert from "node:assert/strict";
import {createRegistrationPost} from "./register-handler";
import {createThoughtPost} from "./thought-handler";

const validRegistration={fullName:"Aditi Sharma",email:"ADITI@EXAMPLE.EDU",department:"Computer Science and Engineering",yearOfStudy:"2nd year",rollNumber:"22CS101"};
let requestNumber=0;
function post(url:string,body:unknown,headers:Record<string,string>={}){
 const host="https://app.test";
 return new Request(host+url,{method:"POST",headers:{origin:host,"content-type":"application/json","x-forwarded-for":"198.51.100."+(++requestNumber),...headers},body:JSON.stringify(body)});
}

test("duplicate registration is idempotent without revealing whether email or roll number was used",async()=>{
 const identifiers=new Set<string>();
 const handler=createRegistrationPost(async data=>{
  if(identifiers.has(data.email)||identifiers.has(data.rollNumber))throw {code:"P2002"};
  identifiers.add(data.email);identifiers.add(data.rollNumber);
 });
 const first=await handler(post("/api/register",validRegistration));
 const second=await handler(post("/api/register",validRegistration));
 assert.equal(first.status,201);
 assert.equal(second.status,201);
 assert.deepEqual(await first.json(),await second.json());
 const otherEmail=await handler(post("/api/register",{...validRegistration,email:"other@example.edu"}));
 assert.equal(otherEmail.status,201);
 assert.deepEqual(await otherEmail.json(),{ok:true});
});

test("concurrent duplicate registrations rely on the database unique constraint",async()=>{
 const emails=new Set<string>();
 const handler=createRegistrationPost(async data=>{
  if(emails.has(data.email))throw {code:"P2002"};
  emails.add(data.email);
  await Promise.resolve();
 });
 const responses=await Promise.all([
  handler(post("/api/register",validRegistration)),
  handler(post("/api/register",validRegistration)),
 ]);
 assert.deepEqual(responses.map(response=>response.status),[201,201]);
 assert.deepEqual(await Promise.all(responses.map(response=>response.json())),[{ok:true},{ok:true}]);
});

test("registration handler rejects malformed fields before persistence",async()=>{
 let createCalls=0;
 const handler=createRegistrationPost(async()=>{createCalls++});
 const response=await handler(post("/api/register",{email:"invalid"}));
 assert.equal(response.status,422);
 assert.equal(createCalls,0);
});

test("registration persists trimmed name, normalized email and roll number",async()=>{
 let saved:unknown;
 const handler=createRegistrationPost(async data=>{saved=data});
 const response=await handler(post("/api/register",{...validRegistration,fullName:" Aditi Sharma ",email:" ADITI@EXAMPLE.EDU ",rollNumber:" 22cs101 "}));
 assert.equal(response.status,201);
 assert.deepEqual(saved,{...validRegistration,fullName:"Aditi Sharma",email:"aditi@example.edu",rollNumber:"22CS101"});
});

test("registration origin and request-size protections remain active",async()=>{
 let createCalls=0;
 const handler=createRegistrationPost(async()=>{createCalls++});
 const badOrigin=await handler(post("/api/register",validRegistration,{origin:"https://elsewhere.test"}));
 assert.equal(badOrigin.status,403);
 const large=new Request("https://app.test/api/register",{method:"POST",headers:{origin:"https://app.test","content-type":"application/json"},body:JSON.stringify({...validRegistration,fullName:"A".repeat(20000)})});
 const tooLarge=await handler(large);
 assert.equal(tooLarge.status,400);
 assert.equal(createCalls,0);
});

test("anonymous thoughts can be submitted without authentication or identity fields",async()=>{
 let saved:unknown;
 const handler=createThoughtPost(async data=>{saved=data});
 const response=await handler(post("/api/thoughts",{message:"A thought with no login"}));
 assert.equal(response.status,201);
 assert.deepEqual(saved,{message:"A thought with no login"});
});

test("anonymous handler rejects invalid payloads before persistence",async()=>{
 let createCalls=0;
 const handler=createThoughtPost(async()=>{createCalls++});
 const response=await handler(post("/api/thoughts",{message:"  ",email:"student@example.edu"}));
 assert.equal(response.status,422);
 assert.equal(createCalls,0);
});

test("database failures return generic errors without leaking exception detail",async()=>{
 const secret="postgres://private-host/password";
 const register=createRegistrationPost(async()=>{throw new Error(secret)});
 const thought=createThoughtPost(async()=>{throw new Error("submitted message should not appear in logs")});
 const regResponse=await register(post("/api/register",validRegistration));
 const thoughtResponse=await thought(post("/api/thoughts",{message:"a private message"}));
 const combined=await Promise.all([regResponse.json(),thoughtResponse.json()]);
 assert.equal(regResponse.status,500);
 assert.equal(thoughtResponse.status,500);
 assert.equal(JSON.stringify(combined).includes(secret),false);
 assert.equal(JSON.stringify(combined).includes("private message"),false);
});

test("API route modules expose no public GET handler for stored records",async()=>{
 const registrations=await import("../app/api/register/route");
 const thoughts=await import("../app/api/thoughts/route");
 assert.equal("GET" in registrations,false);
 assert.equal("GET" in thoughts,false);
});
