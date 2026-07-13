import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/server/actions/clients";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export default function NewClientPage() {
  return (
    <>
      <Topbar title="New client" description="Add a client to start connecting integrations and building reports." />
      <div className="flex-1 p-6">
        <Card className="mx-auto max-w-xl">
          <CardContent className="pt-5">
            <form action={createClient} className="space-y-4">
              <div>
                <Label htmlFor="name">Client name</Label>
                <Input id="name" name="name" required placeholder="Acme Co" />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" placeholder="E-commerce" />
              </div>
              <div>
                <Label htmlFor="timezone">Reporting timezone</Label>
                <Select id="timezone" name="timezone" defaultValue="UTC">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryContactName">Primary contact</Label>
                  <Input id="primaryContactName" name="primaryContactName" placeholder="Jane Doe" />
                </div>
                <div>
                  <Label htmlFor="primaryContactEmail">Contact email</Label>
                  <Input id="primaryContactEmail" name="primaryContactEmail" type="email" placeholder="jane@acme.com" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Create client
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
