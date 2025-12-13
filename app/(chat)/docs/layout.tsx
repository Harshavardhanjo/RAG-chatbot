

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">{children}</div>
  );
}
