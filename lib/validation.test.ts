import {test} from "node:test";
import assert from "node:assert/strict";
import {registrationSchema,thoughtSchema} from "./validation";

test("registration accepts a valid student registration and normalizes email",()=>{
 const parsed=registrationSchema.safeParse({fullName:" Aditi Sharma ",email:" ADITI@EXAMPLE.EDU ",department:"Computer Science and Engineering",yearOfStudy:"2nd year",rollNumber:" 22CS101 "});
 assert.equal(parsed.success,true);
 if(parsed.success){assert.equal(parsed.data.fullName,"Aditi Sharma");assert.equal(parsed.data.email,"aditi@example.edu");assert.equal(parsed.data.rollNumber,"22CS101");}
});

test("registration requires all fields and rejects whitespace-only values",()=>{
 const valid={fullName:"Aditi Sharma",email:"aditi@example.edu",department:"Computer Science and Engineering",yearOfStudy:"2nd year",rollNumber:"22CS101"};
 for(const key of Object.keys(valid)){
  const missing={...valid};delete (missing as Record<string,string>)[key];
  assert.equal(registrationSchema.safeParse(missing).success,false,`${key} is required`);
  assert.equal(registrationSchema.safeParse({...valid,[key]:"   "}).success,false,`${key} cannot be blank`);
 }
});

test("registration rejects malformed email, roll number, branch and year",()=>{
 const valid={fullName:"Aditi Sharma",email:"aditi@example.edu",department:"Computer Science and Engineering",yearOfStudy:"2nd year",rollNumber:"22CS101"};
 for(const email of ["bad","student@","student@example.edu ".repeat(20)])assert.equal(registrationSchema.safeParse({...valid,email}).success,false);
 for(const rollNumber of [" ","../escape","#22CS101","x".repeat(65)])assert.equal(registrationSchema.safeParse({...valid,rollNumber}).success,false);
 assert.equal(registrationSchema.safeParse({...valid,department:"unknown"}).success,false);
 assert.equal(registrationSchema.safeParse({...valid,yearOfStudy:"5th year"}).success,false);
});

test("thoughts require non-whitespace text and enforce the 1500 character limit",()=>{
 assert.equal(thoughtSchema.safeParse({message:"   "}).success,false);
 assert.equal(thoughtSchema.safeParse({message:"x".repeat(1501)}).success,false);
 assert.equal(thoughtSchema.safeParse({message:"A thought"}).success,true);
});

test("anonymous thought schema accepts no identity fields",()=>{
 const parsed=thoughtSchema.parse({message:"A private thought",name:"Not collected",email:"not-collected@example.edu"});
 assert.deepEqual(Object.keys(parsed),["message"]);
});
