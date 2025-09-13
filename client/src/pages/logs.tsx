import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Filter, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "@shared/schema";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-chart-2 text-chart-2-foreground";
      case "read": return "bg-chart-1 text-chart-1-foreground";
      case "sent": return "bg-chart-3 text-chart-3-foreground";
      case "failed": return "bg-destructive text-destructive-foreground";
      case "queued": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.contactId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.campaignId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || message.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportLogs = () => {
    const csvContent = [
      ["ID", "Campaign ID", "Contact ID", "Status", "Sent At", "Delivered At", "Error"].join(","),
      ...filteredMessages.map(message => [
        message.id,
        message.campaignId || "",
        message.contactId || "",
        message.status,
        message.sentAt ? new Date(message.sentAt).toISOString() : "",
        message.deliveredAt ? new Date(message.deliveredAt).toISOString() : "",
        message.error || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Logs & Reports</h2>
              <p className="text-sm text-muted-foreground">View message logs and campaign reports</p>
            </div>
            <Button onClick={exportLogs} data-testid="button-export-logs">
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </header>

        {/* Logs Content */}
        <div className="p-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="filters-title">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter and search through message logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by campaign or contact..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-logs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Results</label>
                  <div className="text-sm text-muted-foreground pt-2" data-testid="results-count">
                    {filteredMessages.length} of {messages.length} messages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="message-logs-title">
                <FileText className="h-5 w-5" />
                Message Logs
              </CardTitle>
              <CardDescription>
                Detailed view of all message delivery statuses and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground" data-testid="loading-logs">Loading logs...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2" data-testid="no-logs-title">
                    {messages.length === 0 ? "No message logs yet" : "No logs match your filters"}
                  </h3>
                  <p className="text-muted-foreground" data-testid="no-logs-description">
                    {messages.length === 0 
                      ? "Message logs will appear here once you start sending campaigns"
                      : "Try adjusting your search terms or filters"
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Message ID</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Delivered At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((message) => (
                        <TableRow key={message.id} data-testid={`log-row-${message.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`log-id-${message.id}`}>
                            {message.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell data-testid={`log-campaign-${message.id}`}>
                            {message.campaignId ? `${message.campaignId.slice(0, 8)}...` : "-"}
                          </TableCell>
                          <TableCell data-testid={`log-contact-${message.id}`}>
                            {message.contactId ? `${message.contactId.slice(0, 8)}...` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(message.status)} data-testid={`log-status-${message.id}`}>
                              {message.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`log-sent-${message.id}`}>
                            {message.sentAt ? new Date(message.sentAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell data-testid={`log-delivered-${message.id}`}>
                            {message.deliveredAt ? new Date(message.deliveredAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" data-testid={`log-error-${message.id}`}>
                            {message.error || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
