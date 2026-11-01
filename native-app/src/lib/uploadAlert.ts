// Upload failures inside a form. The pickers live in <Modal>s, and the app's
// toast renders in the root window *behind* an open modal — so a failed
// upload looked like nothing happened. A native alert shows above the modal.
import { Alert } from 'react-native';

export function alertUploadError(e: unknown, ar = true) {
  const err = e as { code?: string; message?: string; customData?: { serverResponse?: string } };
  const detail = [err?.code, err?.customData?.serverResponse || err?.message].filter(Boolean).join('\n');
  Alert.alert(ar ? 'تعذّر رفع الصورة' : 'Image upload failed', detail || String(e));
}
