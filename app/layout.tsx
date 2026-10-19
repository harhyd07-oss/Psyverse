import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Student Wellbeing | HITAM",description:"A student mental wellbeing initiative at HITAM. Join the conversation or share a thought anonymously."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
