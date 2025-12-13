import type { Attachment } from "ai";

import { LoaderIcon } from "./icons";
import { File } from "lucide-react";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType?.startsWith("image") ? (
          // NOTE: it is recommended to use next/image for images
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={name ?? "An image attachment"}
            className="rounded-md size-full object-cover"
          />
        ) : (
          <File className="text-zinc-500" size={24} />
        )}

        {isUploading && (
          <div className="animate-spin absolute text-zinc-500">
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
