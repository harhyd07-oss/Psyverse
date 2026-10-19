import {prisma} from "@/lib/prisma";
import {createThoughtPost} from "@/lib/thought-handler";
export const runtime="nodejs";
export const POST=createThoughtPost((data)=>prisma.anonymousThought.create({data,select:{id:true}}));
