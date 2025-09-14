import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  userId?: string;
  data?: any;
  read?: boolean;
}

interface NotificationContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationData[];
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Only connect socket when user is authenticated
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Initialize Socket.IO connection for authenticated users
    const newSocket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification server');
      setIsConnected(true);
    });

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated for user:', data.userId);
    });

    newSocket.on('connect_error', (err) => {
      console.log('Socket connect_error:', err.message);
      setIsConnected(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server');
      setIsConnected(false);
    });

    newSocket.on('notification', (notification: NotificationData) => {
      console.log('Received notification:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
      
      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    });

    setSocket(newSocket);
    newSocket.connect(); // Connect after user is authenticated

    return () => {
      newSocket.disconnect();
    };
  }, [toast, user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    isConnected,
    notifications,
    markAsRead,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}