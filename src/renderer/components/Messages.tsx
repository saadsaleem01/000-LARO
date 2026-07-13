import DashboardLayout from "@/components/DashboardLayout";
import CommunicationHub from "@/components/CommunicationHub";

export default function Messages() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your communications with lawyers and support team
          </p>
        </div>
        
        <CommunicationHub />
      </div>
    </DashboardLayout>
  );
}

