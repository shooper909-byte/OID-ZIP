import "./globals.css";
import "./forms.css";
import { SyntheticStagingBanner } from "./_components/SyntheticStagingBanner";
import { syntheticStagingMode } from "../lib/synthetic-staging";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = syntheticStagingMode();
  return <html lang="en"><body><SyntheticStagingBanner mode={mode}/>{children}</body></html>;
}
