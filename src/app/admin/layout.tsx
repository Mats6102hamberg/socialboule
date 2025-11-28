export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth temporarily disabled
  return <>{children}</>;
}
