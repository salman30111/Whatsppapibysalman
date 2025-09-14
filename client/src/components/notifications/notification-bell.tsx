import { useState } from "react";
import { Bell, Check, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/contexts/notification-context";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, isConnected, markAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              data-testid="notification-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end" data-testid="notification-popover">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-600" data-testid="connection-status-connected" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" data-testid="connection-status-disconnected" />
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    data-testid="clear-all-notifications"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground" data-testid="no-notifications">
                  No notifications yet
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-2">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                          notification.read ? 'opacity-60' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none mb-1" data-testid={`notification-title-${notification.id}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mb-1" data-testid={`notification-message-${notification.id}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`notification-time-${notification.id}`}>
                              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}