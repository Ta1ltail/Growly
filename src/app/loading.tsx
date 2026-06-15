// Route-level loading UI. Next wraps each page in a Suspense boundary and shows
// this during navigation/streaming. Rendered inside AppShell, so the sidebar
// and bottom nav stay put while the content area fills in.

import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <PageSkeleton />;
}
