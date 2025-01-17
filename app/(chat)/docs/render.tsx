"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDocument } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Link, FileText } from "lucide-react";
import { User } from "next-auth";
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

type DocumentCardProps = {
  doc?: FileDocument;
  file?: File;
  uploadState: "idle" | "loading" | "error" | "success";
};

export default function RenderFiles({ user }: { user: User | undefined }) {
  const [documentCards, setDocumentCards] = useState<DocumentCardProps[]>([]);
  useEffect(() => {
    // Fetch user's documents here
    const fetchDocs = async () => {
      try {
        const response = await fetch("/api/files");
        console.log("response", response);
        const data = await response.json();
        setDocumentCards(
          data.map((doc: FileDocument) => ({ doc, uploadState: "success" }))
        );
      } catch (error) {
        console.error("Failed to fetch docs:", error);
      }
    };

    fetchDocs();
  }, [user]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      <CreateDocumentCard
        documentCards={documentCards}
        setDocumentCards={setDocumentCards}
      />
      {documentCards.reverse().map((doc, index) => (
        <DocumentCard
          key={index}
          props={{
            uploadState: doc.uploadState,
            doc: doc.doc,
            file: doc.file,
          }}
        />
      ))}
      {documentCards.length === 0 && (
        <div className="text-sm text-muted-foreground p-2">
          No documents found
        </div>
      )}
    </div>
  );
}

const uploadFile = async (file: File): Promise<FileDocument> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/files/upload", {
    method: "POST",
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();

    return data.file as FileDocument;
  } else {
    throw new Error("Failed to upload file");
  }
};

const analyzeDocument = async (fileId: string, userId: string) => {
  console.log(`Starting PDF analysis for file: ${fileId}, user: ${userId}`);
  // Update status to processing
  const response = await fetch(`/api/files/process-pdf`, {
    method: "POST",
    body: JSON.stringify({ fileId, userId }),
  });
};

function DocumentCard({ props }: { props: DocumentCardProps }) {
  const [uploadState, setUploadState] = useState<
    "idle" | "loading" | "error" | "success"
  >(props.uploadState);
  const [doc, setDoc] = useState<FileDocument | undefined>(props.doc);
  useEffect(() => {
    console.log("useEffect", doc, props.file, props.uploadState);
    if (doc) {
      return;
    }

    if (!props.file) {
      return;
    }
    // upload file
    uploadFile(props.file)
      .then((doc) => {
        console.log("uploaded doc", doc);
        setDoc(doc);
        setUploadState("success");
        analyzeDocument(doc.id, doc.userId)
          .catch(() => {
            toast.error("Failed to analyze document");
            setDoc((prevDoc) => {
              return prevDoc ? { ...prevDoc, status: "failed" } : prevDoc;
            });
          })
          .then(() => {
            setDoc((prevDoc) => {
              return prevDoc ? { ...prevDoc, status: "processed" } : prevDoc;
            });
          });
      })
      .catch(() => {
        toast.error("Failed to upload file");
        setUploadState("error");
      });
  }, [doc]);
  return doc ? (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start flex-col gap-2">
          <CardTitle>{doc.name}</CardTitle>
          <CardDescription>
            {new Date(doc.createdAt).toLocaleDateString()}
          </CardDescription>
        </div>
        {doc.status === "processing" && (
          <Badge>
            Processing <span className="animate-pulse">...</span>
          </Badge>
        )}
        {doc.status === "processed" && (
          <Badge variant="success">Processed</Badge>
        )}
        {doc.status === "failed" && <Badge variant="destructive">Failed</Badge>}
      </CardHeader>
      <CardContent>
        <p className="text-sbase text-muted-foreground">{doc.description}</p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className={cn("w-full", "flex items-center justify-center")}
          onClick={() => {
            // Open document
            window.open(`/api/files/${doc.id}`);
          }}
        >
          <FileText className="mr-2" />
          Open Document
        </Button>
      </CardFooter>
    </Card>
  ) : (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start flex-col gap-2">
          <CardTitle>Uploading Document</CardTitle>
          <CardDescription>
            Please wait while we process your document
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {uploadState === "loading" && (
          <div className="flex items-center justify-center">Loading...</div>
        )}
        {uploadState === "error" && (
          <div className="flex items-center justify-center text-red-500">
            Error uploading document
          </div>
        )}
        {uploadState === "success" && (
          <div className="flex items-center justify-center text-green-500">
            Document uploaded successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateDocumentCard({
  documentCards,
  setDocumentCards,
}: {
  documentCards: DocumentCardProps[];
  setDocumentCards: Dispatch<SetStateAction<DocumentCardProps[]>>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start flex-col gap-2">
          <CardTitle>Create a New Document</CardTitle>
          <CardDescription>
            Click below to upload a new document
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // Open file upload dialog
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/pdf";
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (!files || files.length === 0) {
                return;
              }

              //update filedocuments for every file in files
              const filesArray = Array.from(files);

              // Create new document cards for each file
              const newDocumentCards: DocumentCardProps[] = filesArray.map(
                (file) => ({
                  file: file,
                  uploadState: "loading",
                })
              );

              console.log("newDocumentCards", newDocumentCards);

              // Update state with new document cards
              setDocumentCards((prevCards) => [
                ...prevCards,
                ...newDocumentCards,
              ]);

              // Reset input value
              input.value = "";
            };
            input.click();
          }}
        >
          Create Document
        </Button>
      </CardContent>
    </Card>
  );
}
