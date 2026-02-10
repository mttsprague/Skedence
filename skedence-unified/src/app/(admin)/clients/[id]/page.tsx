import ClientDetailPage from './client-page';

// This function is required for static export with dynamic routes
// Returning empty array allows client-side routing to all IDs
export function generateStaticParams(): { id: string }[] {
  return [];
}

export default function Page() {
  return <ClientDetailPage />;
}
