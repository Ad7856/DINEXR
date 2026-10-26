import { TrackView } from "@/features/track/TrackView";

export const metadata = { title: "Track your order", robots: { index: false, follow: false } };
export default function TrackPage({ params, searchParams }: { params: { token: string }; searchParams: { placed?: string } }) {
  return <TrackView token={params.token} justPlaced={searchParams.placed === "1"} />;
}
