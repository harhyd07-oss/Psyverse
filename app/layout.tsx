import type {Metadata} from "next";
import {headers} from "next/headers";
import "./globals.css";
export const metadata:Metadata={title:"Student Wellbeing | HITAM",description:"A student mental wellbeing initiative at HITAM. Join the conversation or share a thought anonymously."};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const requestHeaders=await headers();
 const nonce=requestHeaders.get("x-nonce");
 if(!nonce)throw new Error("Missing CSP nonce from middleware");
 return <html lang="en"><body>{children}</body></html>
}
