import { requiredAuth } from "@/module/auth/utils/auth-utils";
import { redirect } from "next/navigation";


export default async function Home() {
    await requiredAuth()
  return (
     redirect('/dashboard')
  );
}
