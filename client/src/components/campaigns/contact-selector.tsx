import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Users, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Contact } from "@shared/schema";

interface ContactSelectorProps {
  contacts: Contact[];
  selectedContacts: string[];
  onContactsChange: (contactIds: string[]) => void;
  className?: string;
}

export function ContactSelector({ 
  contacts, 
  selectedContacts, 
  onContactsChange, 
  className 
}: ContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");

  // Extract all unique tags and groups
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [contacts]);

  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    contacts.forEach(contact => {
      contact.groups?.forEach(group => groups.add(group));
    });
    return Array.from(groups).sort();
  }, [contacts]);

  // Filter contacts based on search and filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = !searchTerm || 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm);
      
      const matchesTag = !filterTag || filterTag === "__all__" || contact.tags?.includes(filterTag);
      const matchesGroup = !filterGroup || filterGroup === "__all__" || contact.groups?.includes(filterGroup);
      
      return matchesSearch && matchesTag && matchesGroup;
    });
  }, [contacts, searchTerm, filterTag, filterGroup]);

  const handleSelectAll = () => {
    const allFilteredIds = filteredContacts.map(c => c.id);
    const newSelection = Array.from(new Set([...selectedContacts, ...allFilteredIds]));
    onContactsChange(newSelection);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredContacts.map(c => c.id));
    const newSelection = selectedContacts.filter(id => !filteredIds.has(id));
    onContactsChange(newSelection);
  };

  const handleContactToggle = (contactId: string, checked: boolean) => {
    if (checked) {
      onContactsChange([...selectedContacts, contactId]);
    } else {
      onContactsChange(selectedContacts.filter(id => id !== contactId));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterTag("__all__");
    setFilterGroup("__all__");
  };

  const hasActiveFilters = searchTerm || (filterTag && filterTag !== "__all__") || (filterGroup && filterGroup !== "__all__");

  if (contacts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Contacts
          </CardTitle>
          <CardDescription>Choose who will receive this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No contacts available</p>
            <p className="text-sm">Add contacts first to create campaigns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Contacts
        </CardTitle>
        <CardDescription>
          Choose who will receive this campaign ({selectedContacts.length} selected)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All groups</SelectItem>
                {allGroups.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="text-sm">
            <span className="font-medium">{filteredContacts.length}</span> contacts found
            {hasActiveFilters && <span className="text-muted-foreground"> (filtered)</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredContacts.length === 0}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={filteredContacts.filter(c => selectedContacts.includes(c.id)).length === 0}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Contact List */}
        <div className="max-h-64 overflow-y-auto border rounded-lg">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No contacts match your filters</p>
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) => handleContactToggle(contact.id, checked as boolean)}
                      className="mt-1"
                      data-testid={`checkbox-contact-${contact.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{contact.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {contact.phone}
                      </div>
                      {(contact.tags || contact.groups) && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.groups?.map(group => (
                            <Badge key={group} variant="outline" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selection Summary */}
        {selectedContacts.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">{selectedContacts.length}</span> contacts selected for this campaign
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}