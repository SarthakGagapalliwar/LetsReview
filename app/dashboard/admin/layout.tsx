import { requireAdmin } from "@/module/auth/utils/auth-utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-admin users to /dashboard
  await requireAdmin();

  return <>{children}</>;
}
