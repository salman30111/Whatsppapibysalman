import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Search, Edit, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema, type Contact, type InsertContact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { CSVImportDialog } from "@/components/contacts/csv-import-dialog";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportData, formatDate, formatArray, formatObject, formatPhone, getTimestamp } from "@/lib/export-utils";

const contactFormSchema = insertContactSchema.extend({
  tagsString: z.string().optional(),
  groupsString: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      tagsString: "",
      groupsString: "",
      variables: {},
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowAddDialog(false);
      form.reset();
      toast({
        title: "Contact created",
        description: "Contact has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "Contact has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const onSubmit = (data: ContactFormData) => {
    const { tagsString, groupsString, ...contactData } = data;
    
    const tags = tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean) : [];
    const groups = groupsString ? groupsString.split(",").map(group => group.trim()).filter(Boolean) : [];
    
    createContactMutation.mutate({
      ...contactData,
      tags,
      groups,
    });
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone Number', format: formatPhone },
      { key: 'tags', label: 'Tags', format: formatArray },
      { key: 'groups', label: 'Groups', format: formatArray },
      { key: 'variables', label: 'Variables', format: formatObject },
      { key: 'createdAt', label: 'Created At', format: formatDate },
      { key: 'updatedAt', label: 'Updated At', format: formatDate }
    ];
    
    try {
      exportData({
        filename: `contacts-${getTimestamp()}`,
        format,
        columns,
        data: filteredContacts,
        sheetName: 'Contacts'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting contact data.",
        variant: "destructive",
      });
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
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Contacts</h2>
              <p className="text-sm text-muted-foreground">Manage your WhatsApp contacts and groups</p>
            </div>
            <div className="flex items-center space-x-3">
              <ExportDropdown
                onExportCSV={() => handleExport('csv')}
                onExportExcel={() => handleExport('xlsx')}
                disabled={filteredContacts.length === 0}
                label="Export Contacts"
              />
              <Button 
                variant="outline" 
                onClick={() => setShowCSVImportDialog(true)}
                data-testid="button-bulk-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-contact">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-contact">
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Create a new contact for your WhatsApp campaigns.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Contact name"
                          data-testid="input-contact-name"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-destructive" data-testid="error-contact-name">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="+1234567890"
                          data-testid="input-contact-phone"
                          {...form.register("phone")}
                        />
                        {form.formState.errors.phone && (
                          <p className="text-sm text-destructive" data-testid="error-contact-phone">
                            {form.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        placeholder="VIP, Lead, Customer"
                        data-testid="input-contact-tags"
                        {...form.register("tagsString")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="groups">Groups (comma separated)</Label>
                      <Input
                        id="groups"
                        placeholder="Marketing, Support"
                        data-testid="input-contact-groups"
                        {...form.register("groupsString")}
                      />
                    </div>
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAddDialog(false)}
                        data-testid="button-cancel-contact"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createContactMutation.isPending}
                        data-testid="button-save-contact"
                      >
                        {createContactMutation.isPending ? "Saving..." : "Save Contact"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Contacts Content */}
        <div className="p-6 space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-contacts"
              />
            </div>
          </div>

          {/* Contacts List */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="loading-contacts">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="no-contacts-title">
                {searchTerm ? "No contacts found" : "No contacts yet"}
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="no-contacts-description">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Add your first contact to start building your audience"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow" data-testid={`contact-card-${contact.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`contact-name-${contact.id}`}>{contact.name}</CardTitle>
                      <div className="flex items-center space-x-1">
                        <Button size="sm" variant="ghost" data-testid={`button-edit-contact-${contact.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription data-testid={`contact-phone-${contact.id}`}>{contact.phone}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contact.tags && contact.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs" data-testid={`contact-tag-${contact.id}-${index}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {contact.groups && contact.groups.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Groups</p>
                        <div className="flex flex-wrap gap-1">
                          {contact.groups.map((group, index) => (
                            <Badge key={index} variant="outline" className="text-xs" data-testid={`contact-group-${contact.id}-${index}`}>
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground" data-testid={`contact-created-${contact.id}`}>
                      Added {new Date(contact.createdAt!).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* CSV Import Dialog */}
        <CSVImportDialog 
          open={showCSVImportDialog} 
          onOpenChange={setShowCSVImportDialog}
        />
      </main>
    </div>
  );
}
