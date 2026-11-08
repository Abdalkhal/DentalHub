// Photos in direct conversations (native). Sent by the native file uploader
// (nativeUpload.ts); the web has its own dmUpload.ts. Both store under
// dm_files/{threadId}/ (Storage rules: the two participants only).
import { useQuery } from "@tanstack/react-query";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/integrations/firebase/client";
import { randomUUID } from "@/lib/randomId";
import { uploadFileUri } from "./nativeUpload";
import { dmImagePath, type DmImage } from "./directMessages";

export async function uploadDmImage(
  threadId: string,
  file: { uri: string; name?: string | null; type?: string | null; width?: number; height?: number },
): Promise<DmImage> {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = dmImagePath(threadId, randomUUID(), ext);
  await uploadFileUri(path, file.uri, file.type || "image/jpeg");
  return { path, width: file.width, height: file.height };
}

export function useDmImageUrl(path: string | undefined) {
  return useQuery({
    queryKey: ["dm-image", path],
    queryFn: () => getDownloadURL(ref(storage, path!)),
    enabled: !!path,
    staleTime: 50 * 60_000,
  }).data;
}
