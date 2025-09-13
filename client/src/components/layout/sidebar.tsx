import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, BarChart3, Megaphone, Users, FileText, MessageCircle, ListChecks, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { path: "/", label: "Dashboard", icon: BarChart3 },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/messages", label: "Messages", icon: MessageCircle },
  { path: "/logs", label: "Logs & Reports", icon: ListChecks },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="app-title">WA Campaign</h1>
            <p className="text-xs text-muted-foreground" data-testid="app-subtitle">Business Manager</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <a 
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors w-full text-left",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
              >
                <Icon className="w-5 h-5" />
                <span className={cn("font-medium", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-accent-foreground" data-testid="user-initials">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="user-name">
              {user?.name || 'User'}
            </p>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="text-xs" data-testid="user-role">
                {user?.role || 'agent'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
