// The "الرسائل" tab. Tapping it opens the full-screen messages screen
// (app/messages.tsx, a stack screen, so an open chat has no tab bar under
// it) — see the tabPress listener in components/app-tabs.tsx. This route only
// renders if reached directly, and then forwards there too.
import { Redirect } from 'expo-router';

export default function InboxTab() {
  return <Redirect href="/messages" />;
}
