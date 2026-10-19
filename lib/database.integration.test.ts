import {test} from "node:test";
import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import {randomUUID} from "node:crypto";

const enabled=process.env.RUN_DB_INTEGRATION==="true"&&Boolean(process.env.TEST_DATABASE_URL)&&Boolean(process.env.TEST_RUNTIME_DATABASE_URL);

test("PostgreSQL enforces unique email and roll number under concurrent registration inserts",{skip:!enabled},async()=>{
 const prisma=new PrismaClient({datasources:{db:{url:process.env.TEST_RUNTIME_DATABASE_URL}}});
 const cleanup=new PrismaClient({datasources:{db:{url:process.env.TEST_DATABASE_URL}}});
 const suffix=randomUUID();
 const email=`db-integration-${suffix}@example.invalid`;
 const rollNumber=`DB${suffix.replaceAll("-","")}`;
 try{
  const outcomes=await Promise.allSettled([1,2].map(()=>prisma.registration.create({data:{
   fullName:"Integration Test",email,rollNumber,department:"Test Department",yearOfStudy:"Test year",
  },select:{id:true}})));
  assert.equal(outcomes.filter(result=>result.status==="fulfilled").length,1);
  const failures=outcomes.filter((result):result is PromiseRejectedResult=>result.status==="rejected");
  assert.equal(failures.length,1);
  assert.equal(failures[0].reason?.code,"P2002");
 }finally{
  await cleanup.registration.deleteMany({where:{OR:[{email},{rollNumber}]}});
  await prisma.$disconnect();
  await cleanup.$disconnect();
 }
});

test("PostgreSQL persists the registration roll number",{skip:!enabled},async()=>{
 const prisma=new PrismaClient({datasources:{db:{url:process.env.TEST_RUNTIME_DATABASE_URL}}});
 const cleanup=new PrismaClient({datasources:{db:{url:process.env.TEST_DATABASE_URL}}});
 const suffix=randomUUID();
 const email=`db-roll-${suffix}@example.invalid`;
 const rollNumber=`ROLL${suffix.replaceAll("-","")}`;
 try{
  const created=await prisma.registration.create({data:{fullName:"Integration Test",email,rollNumber,department:"Test Department",yearOfStudy:"Test year"},select:{id:true,rollNumber:true}});
  assert.equal(created.rollNumber,rollNumber);
  await cleanup.registration.deleteMany({where:{id:created.id}});
 }finally{
  await prisma.$disconnect();
  await cleanup.$disconnect();
 }
});

test("PostgreSQL stores thoughts without registration identity columns",{skip:!enabled},async()=>{
 const prisma=new PrismaClient({datasources:{db:{url:process.env.TEST_RUNTIME_DATABASE_URL}}});
 const cleanup=new PrismaClient({datasources:{db:{url:process.env.TEST_DATABASE_URL}}});
 let id:string|undefined;
 try{
  const created=await prisma.anonymousThought.create({data:{message:"Disposable database integration test."},select:{id:true}});
  id=created.id;
  const columns=await cleanup.$queryRaw<Array<{column_name:string}>>`
   SELECT column_name FROM information_schema.columns
   WHERE table_schema=current_schema() AND table_name='AnonymousThought'
   ORDER BY column_name`;
  assert.deepEqual(columns.map(column=>column.column_name).sort(),["createdAt","id","message"]);
 }finally{
  if(id)await cleanup.anonymousThought.deleteMany({where:{id}});
  await prisma.$disconnect();
  await cleanup.$disconnect();
 }
});
