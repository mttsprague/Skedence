import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coaching Business Tips & Resources",
  description: "Expert tips and resources for sports coaches. Learn how to grow your coaching business, manage clients, sell lesson packages, and optimize your scheduling.",
  openGraph: {
    title: "Skedence Blog - Coaching Business Tips & Resources",
    description: "Expert tips and resources for sports coaches. Learn how to grow your coaching business, manage clients, sell lesson packages, and optimize your scheduling.",
    url: "https://skedence.com/blog",
    siteName: "Skedence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skedence Blog - Coaching Business Tips & Resources",
    description: "Expert tips and resources for sports coaches. Learn how to grow your coaching business, manage clients, sell lesson packages, and optimize your scheduling.",
  },
  alternates: {
    canonical: "https://skedence.com/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
