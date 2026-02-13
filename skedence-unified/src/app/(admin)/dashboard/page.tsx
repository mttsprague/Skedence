export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-foreground/80 text-sm font-medium">Total Clients</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-foreground/80 text-sm font-medium">Today&apos;s Sessions</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-foreground/80 text-sm font-medium">Monthly Revenue</h3>
          <p className="text-3xl font-bold mt-2">$0</p>
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <p className="text-foreground/80">
          Welcome to Skedence! This is your admin dashboard. 
          The full admin portal will be migrated from the existing admin-portal directory.
        </p>
      </div>
    </div>
  );
}
