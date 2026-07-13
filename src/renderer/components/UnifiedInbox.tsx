import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  Phone,
  Search,
  Archive,
  RefreshCw,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function UnifiedInbox() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  // Fetch threads
  const { data: threads, isLoading, refetch } = trpc.unifiedInbox.getThreads.useQuery({
    limit: 50,
    offset: 0,
  });

  // Fetch messages for selected thread
  const { data: messages } = trpc.unifiedInbox.getThreadMessages.useQuery(
    { threadId: selectedThread!, limit: 100, offset: 0 },
    { enabled: !!selectedThread }
  );

  // Mark as read mutation
  const markAsRead = trpc.unifiedInbox.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Archive thread mutation
  const archiveThread = trpc.unifiedInbox.archiveThread.useMutation({
    onSuccess: () => {
      toast.success("Thread archived");
      setSelectedThread(null);
      refetch();
    },
  });

  // Send message with AI threading
  const sendMessage = trpc.unifiedInbox.createMessageWithThreading.useMutation({
    onSuccess: () => {
      toast.success("Message sent");
      setReplyText("");
      refetch();
    },
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <Phone className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      case "in_app":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email":
        return "bg-blue-500";
      case "sms":
        return "bg-green-500";
      case "whatsapp":
        return "bg-emerald-500";
      case "in_app":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredThreads = threads?.filter((thread) => {
    if (channelFilter !== "all") {
      const channels = JSON.parse(thread.channels || "[]");
      if (!channels.includes(channelFilter)) return false;
    }
    if (searchQuery) {
      return thread.subject.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const selectedThreadData = threads?.find((t) => t.id === selectedThread);

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedThreadData) return;

    const participants = JSON.parse(selectedThreadData.participants || "[]");
    const channels = JSON.parse(selectedThreadData.channels || "[]");

    sendMessage.mutate({
      caseId: selectedThreadData.caseId || undefined,
      channel: channels[0] || "in_app",
      sender: "me@example.com", // TODO: Get from auth context
      recipient: participants[0] || "unknown",
      subject: selectedThreadData.subject,
      body: replyText,
      direction: "outbound",
      status: "sent",
      sentAt: new Date(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Thread List Sidebar */}
      <div className="w-96 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Inbox</h1>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Channel Filter */}
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="in_app">In-App</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredThreads?.map((thread) => {
              const channels = JSON.parse(thread.channels || "[]");
              const isSelected = thread.id === selectedThread;

              return (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                    isSelected ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {channels.map((channel: string) => (
                        <div
                          key={channel}
                          className={`p-1 rounded ${getChannelColor(channel)} text-white`}
                        >
                          {getChannelIcon(channel)}
                        </div>
                      ))}
                    </div>
                    {thread.unreadCount > 0 && (
                      <Badge variant="default" className="rounded-full">
                        {thread.unreadCount}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                    {thread.subject}
                  </h3>

                  {thread.aiSummary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {thread.aiSummary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{thread.messageCount} messages</span>
                    <span>
                      {thread.lastMessageAt
                        ? formatDistanceToNow(new Date(thread.lastMessageAt), {
                            addSuffix: true,
                          })
                        : "No messages"}
                    </span>
                  </div>

                  {thread.aiTopics && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {JSON.parse(thread.aiTopics).slice(0, 3).map((topic: string) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col">
        {selectedThread && selectedThreadData ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedThreadData.subject}</h2>
                {selectedThreadData.aiTopics && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {JSON.parse(selectedThreadData.aiTopics).map((topic: string) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveThread.mutate({ id: selectedThread })}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages?.map((message) => {
                const isOutbound = message.direction === "outbound";

                return (
                  <Card
                    key={message.id}
                    className={`p-4 ${isOutbound ? "ml-auto bg-primary/5" : "mr-auto"} max-w-2xl`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{message.sender}</p>
                        <p className="text-xs text-muted-foreground">
                          to {message.recipient}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${getChannelColor(message.channel)} text-white`}>
                          {getChannelIcon(message.channel)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {message.sentAt
                            ? formatDistanceToNow(new Date(message.sentAt), {
                                addSuffix: true,
                              })
                            : "Unknown"}
                        </span>
                      </div>
                    </div>

                    {message.subject && (
                      <p className="font-medium text-sm mb-2">{message.subject}</p>
                    )}

                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>

                    {message.aiCategory && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {message.aiCategory.replace("_", " ")}
                        </Badge>
                        {message.aiSentiment && (
                          <Badge
                            variant={
                              message.aiSentiment === "positive"
                                ? "default"
                                : message.aiSentiment === "negative"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {message.aiSentiment}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSendReply} disabled={!replyText.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
