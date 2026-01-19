import { requiredAuth } from "@/module/auth/utils/auth-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function HomeContent() {
  await requiredAuth();
  redirect("/dashboard");
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
