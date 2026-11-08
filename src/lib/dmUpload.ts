// Photos in direct conversations (web). The native app has its own
// dmUpload.ts that sends the file through the native uploader; both store
// under dm_files/{threadId}/ (Storage rules: the two participants only).
import { useQuery } from "@tanstack/react-query";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/integrations/firebase/client";
import { uploadData } from "./uploadData";
import { dmImagePath, type DmImage } from "./directMessages";

export async function uploadDmImage(threadId: string, file: File): Promise<DmImage> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");
  if (file.size >= 10 * 1024 * 1024) throw new Error("too-large");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = dmImagePath(threadId, crypto.randomUUID(), ext);
  await uploadData(ref(storage, path), file, { contentType: file.type });
  const size = await new Promise<{ width?: number; height?: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = URL.createObjectURL(file);
  });
  return { path, ...size };
}

export function useDmImageUrl(path: string | undefined) {
  return useQuery({
    queryKey: ["dm-image", path],
    queryFn: () => getDownloadURL(ref(storage, path!)),
    enabled: !!path,
    staleTime: 50 * 60_000,
  }).data;
}
