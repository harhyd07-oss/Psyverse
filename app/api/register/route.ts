import {prisma} from "@/lib/prisma";
import {createRegistrationPost} from "@/lib/register-handler";
export const runtime="nodejs";
export const POST=createRegistrationPost((data)=>prisma.registration.create({data,select:{id:true}}));
