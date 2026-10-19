type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
const MAX_BUCKETS=5000;
const CLEANUP_INTERVAL_MS=60000;
let lastCleanup=Date.now();
// Process-local only. Production/serverless deployments need a shared limiter.
export function allowRequest(key:string,limit:number,windowMs:number){
 const now=Date.now();
 if(now-lastCleanup>=CLEANUP_INTERVAL_MS){
  for(const[bucketKey,bucket]of buckets)if(bucket.resetAt<=now)buckets.delete(bucketKey);
  lastCleanup=now;
 }
 let bucket=buckets.get(key);
 if(bucket&&bucket.resetAt<=now){buckets.delete(key);bucket=undefined}
 if(!bucket){if(buckets.size>=MAX_BUCKETS)return false;buckets.set(key,{count:1,resetAt:now+windowMs});return true}
 if(bucket.count>=limit)return false;
 bucket.count++;
 return true;
}
export function throttleKey(request:Request){return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown"}
export function expectedOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{
  const requestUrl=new URL(request.url);
  const host=request.headers.get("host");
  const forwardedProto=request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol=forwardedProto==="https"||forwardedProto==="http"?forwardedProto:requestUrl.protocol.slice(0,-1);
  const expectedOrigin=host?new URL(`${protocol}://${host}`).origin:requestUrl.origin;
  return new URL(origin).origin===expectedOrigin;
 }catch{return false}
}
export async function readLimitedJson(request:Request,max=12000):Promise<unknown|null>{
 if(Number(request.headers.get("content-length")||0)>max||!request.body)return null;
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();return null}chunks.push(part.value)}}catch{return null}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}
}
