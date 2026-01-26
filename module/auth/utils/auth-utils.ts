import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const requiredAuth = async () => {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      redirect("/login");
    }

    return session;
  } catch (error) {
    console.error("requiredAuth failed to fetch session", error);
    redirect("/login");
  }
};

export const requiredUnAuth = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  if (session) {
    redirect("/dashboard");
  }
  return session;
};

export const requireAdmin = async () => {
  const session = await requiredAuth();

  // Check if user has admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
};
