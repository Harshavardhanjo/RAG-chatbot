import { auth } from "@/app/(auth)/auth";
import RenderFiles from "./render";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderDescription,
} from "./page-header";

export default async function Page() {
  const session = await auth();

  return (
    <div className="flex flex-col min-h-screen bg-background space-y-5">
      {/* Header Section */}
      <div className="border-b">
        <div className="container flex h-16 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Back to Chat</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-8 px-3">
        <PageHeader>
          <div className="flex items-center gap-4">
            <FileText className="h-8 w-8" />
            <PageHeaderHeading>Your Documents</PageHeaderHeading>
          </div>
        </PageHeader>

        <Separator className="my-6" />

        {session && session.user ? (
          <div className="grid gap-6">
            <RenderFiles user={session.user} />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Sign in to Access Your Documents
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Please sign in to view and manage your uploaded documents.
              </p>
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
