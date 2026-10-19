import {NextResponse} from "next/server";
import {registrationSchema} from "./validation";
import {allowRequest,expectedOrigin,readLimitedJson,throttleKey} from "./request-safety";

type ParsedRegistration=ReturnType<typeof registrationSchema.parse>;
type RegistrationData=ParsedRegistration;
type CreateRegistration=(data:RegistrationData)=>Promise<unknown>;
function isUniqueViolation(error:unknown){return typeof error==="object"&&error!==null&&"code"in error&&error.code==="P2002"}

export function createRegistrationPost(create:CreateRegistration){
 return async function POST(request:Request){
  if(!expectedOrigin(request))return NextResponse.json({error:"This request could not be verified. Refresh and try again."},{status:403});
  if(!allowRequest("r:"+throttleKey(request),5,3600000))return NextResponse.json({error:"Too many attempts. Please try again later."},{status:429});
  const body=await readLimitedJson(request);
  if(!body)return NextResponse.json({error:"We couldn't read that submission. Please check the form and try again."},{status:400});
  const parsed=registrationSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Please review the form details.",fields:parsed.error.flatten().fieldErrors},{status:422});
  try{
   await create(parsed.data);
   return NextResponse.json({ok:true},{status:201});
  }catch(error){
   // Keep duplicate and newly-created registrations indistinguishable to prevent identifier enumeration.
   if(isUniqueViolation(error))return NextResponse.json({ok:true},{status:201});
   return NextResponse.json({error:"We couldn't save your registration right now. Please try again shortly."},{status:500});
  }
 };
}
