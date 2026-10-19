import {NextRequest,NextResponse} from "next/server";

export function buildCsp(nonce:string,nodeEnv=process.env.NODE_ENV){
 const scriptSources=["'self'",`'nonce-${nonce}'`,"'strict-dynamic'"];
 if(nodeEnv==="development")scriptSources.push("'unsafe-eval'");
 const directives=[
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  nodeEnv==="development"?"style-src 'self' 'unsafe-inline'":`style-src 'self' 'nonce-${nonce}'`,
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
 ];
 if(nodeEnv==="production")directives.push("upgrade-insecure-requests");
 return directives.join("; ");
}

export function middleware(request:NextRequest){
 const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
 const csp=buildCsp(nonce);
 const requestHeaders=new Headers(request.headers);
 requestHeaders.set("x-nonce",nonce);
 requestHeaders.set("Content-Security-Policy",csp);
 const response=NextResponse.next({request:{headers:requestHeaders}});
 response.headers.set("Content-Security-Policy",csp);
 if(process.env.NODE_ENV==="production"&&request.headers.get("x-forwarded-proto")==="https"){
  response.headers.set("Strict-Transport-Security","max-age=31536000");
 }
 return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
