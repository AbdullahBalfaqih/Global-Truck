// This is a new layout file specifically for the driver tracking page.
// It ensures that no authenticated layout (sidebar, header) is applied.

export default function DriverTrackingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {children}
        </main>
    );
}
