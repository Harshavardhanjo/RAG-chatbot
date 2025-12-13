"use client";

import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2, RefreshCw, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { RagProcessViewer } from "@/components/rag-process-viewer";
import { ChunkViewer } from "@/components/chunk-viewer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileDocument } from "@/lib/db/schema";

export function KnowledgeBase() {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [viewingFile, setViewingFile] = useState<FileDocument | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("KnowledgeBase component mounted");
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    setIsUploading(true);
    setUploadStep("Starting upload...");
    setEvents([{ type: 'log', message: "Starting upload..." }]);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        
        const lines = chunkValue.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                setEvents(prev => [...prev, data]);
                
                if (data.status === 'progress' || data.type === 'log') {
                   // Handle standard messages
                   if (data.message) setUploadStep(data.message);
                } 
                else if (data.status === 'complete') {
                    toast.success("File processed successfully");
                    setUploadStep("Processing complete.");
                    fetchFiles();
                } else if (data.status === 'error') {
                     toast.error("Processing failed");
                     setIsUploading(false); 
                }
            } catch (e) {
                // partial chunk
            }
        }
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setIsUploading(false); // Close on error
      setUploadStep("");
    } finally {
        // Do NOT close here. Wait for user to dismiss the Viewer.
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`/api/files/delete?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("File deleted");
        fetchFiles();
      } else {
        toast.error("Failed to delete file");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    }
  };


  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} files?`)) return;

    try {
       const res = await fetch("/api/files/bulk-delete", {
           method: "POST",
           body: JSON.stringify({ ids: Array.from(selectedIds) }),
       });

       if (res.ok) {
           const data = await res.json();
           toast.success(`Deleted ${data.deletedCount} files`);
           setSelectedIds(new Set());
           fetchFiles();
       } else {
           toast.error("Failed to delete selected files");
       }
    } catch (error) {
        toast.error("Failed to delete selected files");
    }
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === files.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(files.map(f => f.id)));
      }
  };

  return (
    <>
      <RagProcessViewer 
        isOpen={isUploading} 
        events={events}
        onClose={() => setIsUploading(false)} 
      />
      <ChunkViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      
      <Button variant="outline" size="sm" className="flex gap-2" onClick={() => setIsOpen(true)}>
        <FileText size={16} />
        Knowledge Base
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-[800px] w-full">
          <SheetHeader>
            <SheetTitle>Knowledge Base</SheetTitle>
            <SheetDescription>
              View and manage your uploaded files.
            </SheetDescription>
          </SheetHeader>

          <div className="flex justify-between items-center my-4">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/pdf"
              onChange={handleFileChange}
            />
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={handleUploadClick} disabled={isUploading}>
                  {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                      <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Upload PDF"}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-2">Refresh</span>
            </Button>

            
            {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                </Button>
            )}
          </div>
          
           {files.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 pointer-events-auto"
                    checked={selectedIds.size === files.length && files.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
              </div>
           )}

          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            {loading && files.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                No files uploaded yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {files.map((file) => (
                  <FileItem 
                    key={file.id} 
                    file={file} 
                    isSelected={selectedIds.has(file.id)}
                    onToggle={() => toggleSelection(file.id)}
                    onDelete={() => handleDelete(file.id)}
                    onView={() => setViewingFile(file)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FileItem({ 
    file, 
    isSelected,
    onToggle,
    onDelete, 
    onView 
}: { 
    file: FileDocument; 
    isSelected: boolean;
    onToggle: () => void;
    onDelete: () => void; 
    onView: () => void;
}) {

  return (
    <div className={`flex flex-col gap-1 p-3 border rounded-lg transition-colors ${isSelected ? 'bg-blue-500/10 border-blue-500/50' : 'bg-muted/50 hover:bg-muted'}`}>
      <div className="flex items-center justify-between gap-3">
        <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={(e) => { e.stopPropagation(); onToggle(); }}
            className="w-4 h-4 rounded border-gray-300 pointer-events-auto"
        />
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={onView}>
            <div className="w-8 h-8 rounded bg-background flex items-center justify-center border shrink-0">
                <FileText size={16} className="text-muted-foreground" />
            </div>
            <div className="font-medium truncate" title={file.name}>
                {file.name}
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground uppercase bg-background px-2 py-0.5 rounded border">
            {file.status}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded transition-colors"
                title="Delete File"
            >
                <Trash size={14} />
            </button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground flex justify-between pl-11">
        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
        <span>{formatDistanceToNow(new Date(file.createdAt))} ago</span>
      </div>
    </div>
  );
}
