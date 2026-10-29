import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import CustomCursor from "@/components/CustomCursor";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "CampusPilot AI — Intelligent Student Support Agent",
  description:
    "Next-generation agentic AI co-pilot for university campus life: grounded policy retrieval, fee status, academic calendar, memory, and zero-trust privacy.",
  keywords: ["AI student assistant", "LangGraph", "FastAPI", "Campus AI", "BM25 retrieval", "CampusPilot"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-200 antialiased selection:bg-indigo-500/30 selection:text-white">
        <Providers>
          <CustomCursor />
          {children}
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
