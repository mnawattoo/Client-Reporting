import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar agencyName={session?.user.agencyName ?? "Agency"} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
