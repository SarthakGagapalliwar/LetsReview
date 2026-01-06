import { requiredAuth } from "@/module/auth/utils/auth-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function HomeContent() {
  await requiredAuth();
  redirect("/dashboard");
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
