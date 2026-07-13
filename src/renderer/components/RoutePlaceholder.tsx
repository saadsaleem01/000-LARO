import DashboardLayout from "@/components/DashboardLayout";

export default function RoutePlaceholder({ title }: { title: string }) {
  return (
    <DashboardLayout>
      <div className="p-8 text-muted-foreground">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm">
          This screen is not fully wired in this checkout yet. Use Cases, Evidence, and Lawyers for the core
          workflow.
        </p>
      </div>
    </DashboardLayout>
  );
}
