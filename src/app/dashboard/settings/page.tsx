import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateAgencyBranding } from "@/server/actions/agency";

export default async function SettingsPage() {
  const session = await requireSession();

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: session.user.agencyId },
    include: { users: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <>
      <Topbar title="Settings" description="Agency branding and team" />
      <div className="flex-1 space-y-6 p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>White-label branding</CardTitle>
            <CardDescription>
              Shown on every client report — the logo and colors your clients see, not Reportly&apos;s.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAgencyBranding} className="space-y-4">
              <div>
                <Label htmlFor="name">Agency name</Label>
                <Input id="name" name="name" defaultValue={agency.name} required />
              </div>
              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" name="logoUrl" defaultValue={agency.logoUrl ?? ""} placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="primaryColor"
                      id="primaryColor"
                      defaultValue={agency.primaryColor}
                      className="h-10 w-14 shrink-0 rounded border border-border"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary color</Label>
                  <input
                    type="color"
                    name="secondaryColor"
                    id="secondaryColor"
                    defaultValue={agency.secondaryColor}
                    className="h-10 w-14 shrink-0 rounded border border-border"
                  />
                </div>
              </div>
              <Button type="submit">Save branding</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Everyone with access to {agency.name}&apos;s reporting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gridline">
              {agency.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">{user.name}</p>
                    <p className="text-xs text-ink-muted">{user.email}</p>
                  </div>
                  <Badge variant="muted">{user.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
