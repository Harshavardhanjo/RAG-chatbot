"use client";

import { useEffect, useState } from "react";
import type { User } from "next-auth";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { FileDocument } from "@/lib/db/schema";

export function UserDocs({ user }: { user: User | undefined }) {
  const [docs, setDocs] = useState<FileDocument[]>([]);

  useEffect(() => {
    // Fetch user's documents here
    const fetchDocs = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/files");
        console.log("response", response);
        const data = await response.json();
        setDocs(data);
      } catch (error) {
        console.error("Failed to fetch docs:", error);
      }
    };

    fetchDocs();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-2">
      {docs.map((doc) => (
        <Link
          key={doc.id}
          href={`/docs/${doc.id}`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-muted"
        >
          <FileText className="h-6 w-6" />
          <div className="flex flex-col">
            <span className="font-medium">{doc.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString()}
            </span>
          </div>
        </Link>
      ))}
      {docs.length === 0 && (
        <div className="text-sm text-muted-foreground p-2">
          No documents found
        </div>
      )}
    </div>
  );
}
