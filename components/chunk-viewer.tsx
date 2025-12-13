"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Check } from "lucide-react";
import type { FileDocument } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChunkViewerProps {
  file: FileDocument | null;
  onClose: () => void;
}

export function ChunkViewer({ file, onClose }: ChunkViewerProps) {
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setLoading(true);
      fetch(`/api/files/${file.id}/chunks`)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        })
        .then((data) => setChunks(data))
        .catch((err) => {
            console.error(err);
            toast.error("Failed to load chunks");
        })
        .finally(() => setLoading(false));
    } else {
        setChunks([]);
    }
  }, [file]);

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Chunks</DialogTitle>
          <DialogDescription>
            {file?.name} - {chunks.length} extracted segments
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4 mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              No chunks found for this document.
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {chunks.map((chunk, idx) => (
                <ChunkCard key={chunk.id} chunk={chunk} index={idx} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ChunkCard({ chunk, index }: { chunk: any; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(chunk.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
            </div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">
                Chunk #{index + 1}
            </div>
            <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {chunk.content}
            </div>
        </div>
    );
}
