import { Sidebar } from "@/components/layout/sidebar";
import { QuickSend } from "@/components/dashboard/quick-send";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Message, Reply } from "@shared/schema";

export default function Messages() {
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: replies = [], isLoading: loadingReplies } = useQuery<Reply[]>({
    queryKey: ["/api/replies"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-chart-2 text-chart-2-foreground";
      case "read": return "bg-chart-1 text-chart-1-foreground";
      case "sent": return "bg-chart-3 text-chart-3-foreground";
      case "failed": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text": return <MessageSquare className="h-4 w-4" />;
      case "image": return "🖼️";
      case "document": return "📄";
      case "video": return "🎥";
      case "audio": return "🎵";
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Messages</h2>
              <p className="text-sm text-muted-foreground">Send messages and view replies</p>
            </div>
          </div>
        </header>

        {/* Messages Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Send */}
            <div className="lg:col-span-1">
              <QuickSend />
            </div>
            
            {/* Recent Messages */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid="recent-messages-title">
                    <Send className="h-5 w-5" />
                    Recent Messages
                  </CardTitle>
                  <CardDescription>
                    Latest outgoing messages and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMessages ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground" data-testid="loading-messages">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2" data-testid="no-messages-title">No messages sent yet</h3>
                      <p className="text-muted-foreground" data-testid="no-messages-description">
                        Start sending messages to see them here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.slice(0, 10).map((message) => (
                        <div key={message.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`message-item-${message.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Send className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground" data-testid={`message-contact-${message.id}`}>
                                Contact: {message.contactId || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`message-sent-${message.id}`}>
                                {message.sentAt ? new Date(message.sentAt).toLocaleString() : "Not sent"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(message.status)} data-testid={`message-status-${message.id}`}>
                              {message.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Incoming Replies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="incoming-replies-title">
                <MessageSquare className="h-5 w-5" />
                Incoming Replies
              </CardTitle>
              <CardDescription>
                Messages received from contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReplies ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground" data-testid="loading-replies">Loading replies...</p>
                </div>
              ) : replies.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2" data-testid="no-replies-title">No replies yet</h3>
                  <p className="text-muted-foreground" data-testid="no-replies-description">
                    Incoming messages from contacts will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replies.slice(0, 10).map((reply) => (
                    <div key={reply.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg" data-testid={`reply-item-${reply.id}`}>
                      <div className="w-8 h-8 bg-chart-2/10 rounded-lg flex items-center justify-center mt-1">
                        {getTypeIcon(reply.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground" data-testid={`reply-contact-${reply.id}`}>
                            Contact: {reply.contactId || "Unknown"}
                          </p>
                          <span className="text-xs text-muted-foreground" data-testid={`reply-time-${reply.id}`}>
                            {new Date(reply.receivedAt!).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground" data-testid={`reply-text-${reply.id}`}>
                          {reply.text || `${reply.type} message`}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs" data-testid={`reply-type-${reply.id}`}>
                            {reply.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
