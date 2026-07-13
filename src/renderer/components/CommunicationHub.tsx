import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MessageSquare,
  Mail,
  Send,
  Clock,
  CheckCheck,
  AlertCircle,
  FileText,
  Search,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  status: "sent" | "delivered" | "read" | "replied";
  priority: "high" | "medium" | "low";
  caseId?: string;
  responseTime?: number; // in hours
}

const MESSAGE_TEMPLATES = [
  {
    id: "status-update",
    title: "Request Status Update",
    content: "Dear [Lawyer Name],\n\nI hope this message finds you well. I wanted to follow up regarding my case [Case ID]. Could you please provide an update on the current status?\n\nThank you for your time.\n\nBest regards,\n[Your Name]",
  },
  {
    id: "document-request",
    title: "Request Documents",
    content: "Dear [Lawyer Name],\n\nI would like to request copies of the following documents related to my case:\n\n- [Document 1]\n- [Document 2]\n\nPlease let me know when these will be available.\n\nThank you,\n[Your Name]",
  },
  {
    id: "meeting-request",
    title: "Request Meeting",
    content: "Dear [Lawyer Name],\n\nI would like to schedule a meeting to discuss my case in more detail. Are you available for a consultation in the coming week?\n\nPlease let me know your availability.\n\nBest regards,\n[Your Name]",
  },
  {
    id: "thank-you",
    title: "Thank You",
    content: "Dear [Lawyer Name],\n\nThank you for your assistance with my case. I appreciate your professionalism and expertise.\n\nBest regards,\n[Your Name]",
  },
];

export default function CommunicationHub({ caseId }: { caseId?: string }) {
  // Fetch messages from backend (filtered by case if caseId provided)
  const { data: messagesData = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    caseId ? { caseId } : undefined
  );
  
  // Fetch message templates from backend
  const { data: templatesData = [] } = trpc.messageTemplates.list.useQuery();
  
  // Send message mutation
  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("Message sent successfully");
      setMessageContent("");
      setSubject("");
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    },
  });
  
  // Mark as read mutation
  const markAsReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });
  
  // Convert backend messages to frontend format
  const messages: Message[] = messagesData.map((msg) => ({
    id: msg.id,
    from: msg.direction === "sent" ? "You" : "Lawyer",
    to: msg.direction === "sent" ? "Lawyer" : "You",
    subject: msg.subject || "No subject",
    content: msg.body,
    timestamp: msg.sentAt || new Date(),
    status: msg.status as any,
    priority: msg.priority as any,
    caseId: msg.caseId || undefined,
    responseTime: msg.readAt && msg.sentAt 
      ? (msg.readAt.getTime() - msg.sentAt.getTime()) / (1000 * 60 * 60)
      : undefined,
  }));

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [messageContent, setMessageContent] = useState("");
  const [subject, setSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Use backend templates if available, otherwise fallback to hardcoded
  const MESSAGE_TEMPLATES = templatesData.length > 0 
    ? templatesData.map((t) => ({
        id: t.id,
        title: t.name,
        content: t.body,
        subject: t.subject,
      }))
    : [
      {
        id: "status-update",
        title: "Request Status Update",
        content: "Dear [Lawyer Name],\n\nI hope this message finds you well. I wanted to follow up regarding my case [Case ID]. Could you please provide an update on the current status?\n\nThank you for your time.\n\nBest regards,\n[Your Name]",
      },
      {
        id: "document-request",
        title: "Request Documents",
        content: "Dear [Lawyer Name],\n\nI would like to request copies of the following documents related to my case:\n\n- [Document 1]\n- [Document 2]\n\nPlease let me know when these will be available.\n\nThank you,\n[Your Name]",
      },
      {
        id: "meeting-request",
        title: "Request Meeting",
        content: "Dear [Lawyer Name],\n\nI would like to schedule a meeting to discuss my case in more detail. Are you available for a consultation in the coming week?\n\nPlease let me know your availability.\n\nBest regards,\n[Your Name]",
      },
      {
        id: "thank-you",
        title: "Thank You",
        content: "Dear [Lawyer Name],\n\nThank you for your assistance with my case. I appreciate your professionalism and expertise.\n\nBest regards,\n[Your Name]",
      },
    ];
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const handleTemplateSelect = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.content);
      setSelectedTemplate(templateId);
      toast.success(`Template "${template.title}" loaded`);
    }
  };

  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      toast.error("Please enter a message");
      return;
    }

    sendMessageMutation.mutate({
      subject: subject || "No subject",
      body: messageContent,
      priority: "normal",
    });
    
    setSelectedTemplate("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="w-4 h-4 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-4 h-4 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case "replied":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.to.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus;
    const matchesPriority = filterPriority === "all" || msg.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const unreadCount = messages.filter(m => m.from !== "You" && m.status !== "read").length;
  const avgResponseTime = messages
    .filter(m => m.responseTime)
    .reduce((acc, m) => acc + (m.responseTime || 0), 0) / 
    messages.filter(m => m.responseTime).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Messages</p>
                <p className="text-3xl font-bold">{messages.length}</p>
              </div>
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Unread</p>
                <p className="text-3xl font-bold">{unreadCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Response Time</p>
                <p className="text-3xl font-bold">{avgResponseTime.toFixed(1)}h</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox">
            <Mail className="w-4 h-4 mr-2" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compose">
            <Send className="w-4 h-4 mr-2" />
            Compose
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <Card key={message.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{message.subject}</h4>
                            <Badge variant={getPriorityColor(message.priority)} className="text-xs">
                              {message.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {message.from === "You" ? `To: ${message.to}` : `From: ${message.from}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusIcon(message.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>

                      {message.caseId && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {message.caseId}
                        </Badge>
                      )}

                      {message.responseTime && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Response time: {message.responseTime}h
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredMessages.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No messages found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          {/* Message Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Message Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MESSAGE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="text-left">
                      <p className="font-medium">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to use this template
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compose Form */}
          <Card>
            <CardHeader>
              <CardTitle>New Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">To</label>
                <Input placeholder="Select lawyer or enter email" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input placeholder="Message subject" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={10}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMessageContent("");
                    setSelectedTemplate("");
                  }}
                >
                  Clear
                </Button>
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

