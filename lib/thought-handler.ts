import {NextResponse} from "next/server";
import {thoughtSchema} from "./validation";
import {allowRequest,expectedOrigin,readLimitedJson,throttleKey} from "./request-safety";

type CreateThought=(data:{message:string})=>Promise<unknown>;

export function createThoughtPost(create:CreateThought){
 return async function POST(request:Request){
  if(!expectedOrigin(request))return NextResponse.json({error:"This request could not be verified. Refresh and try again."},{status:403});
  if(!allowRequest("t:"+throttleKey(request),5,3600000))return NextResponse.json({error:"A few messages have already been shared from this connection. Please try again later."},{status:429});
  const body=await readLimitedJson(request);
  if(!body)return NextResponse.json({error:"We couldn't read that message. Please try again."},{status:400});
  const parsed=thoughtSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Please check your message."},{status:422});
  try{
   await create({message:parsed.data.message});
   return NextResponse.json({ok:true},{status:201});
  }catch{
   return NextResponse.json({error:"We couldn't save your message right now. Please try again shortly."},{status:500});
  }
 };
}
