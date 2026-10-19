import {z} from "zod";
import {eventConfig} from "./event";
export const registrationSchema=z.object({
 fullName:z.string().trim().min(2,"Please enter your full name.").max(120,"Please keep your name under 120 characters."),
 email:z.string().trim().email("Enter a valid email address.").max(254).transform(v=>v.toLowerCase()),
 department:z.string().refine(v=>eventConfig.departments.includes(v),"Choose a department from the list."),
 yearOfStudy:z.enum(["1st year","2nd year","3rd year","4th year"]),
 rollNumber:z.string().trim().min(1,"Enter your college roll number.").max(64,"Please keep your roll number under 64 characters.").refine(v=>/^[\p{L}\p{N}][\p{L}\p{N}._/-]*$/u.test(v),"Enter a valid college roll number.").transform(v=>v.toUpperCase())
});
export const thoughtSchema=z.object({message:z.string().trim().min(1,"Write a few words before sharing.").max(1500,"Your message must be 1,500 characters or fewer.")});
