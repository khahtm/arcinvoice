'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import Link from 'next/link';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (ids: string[]) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationDropdown({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const unread = notifications.filter((n) => !n.read);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkRead([notification.id]);
    }
    onClose();
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden shadow-lg z-50">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <div className="flex gap-1">
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAllRead()}
              title="Mark all read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-72">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </p>
        ) : (
          notifications.slice(0, 20).map((notification) => (
            <Link
              key={notification.id}
              href={
                notification.invoice_id
                  ? `/invoices/${notification.invoice_id}`
                  : '/dashboard'
              }
              onClick={() => handleNotificationClick(notification)}
              className={`block p-3 border-b hover:bg-muted transition-colors ${
                !notification.read ? 'bg-blue-50 dark:bg-blue-950/30' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.body}
                  </p>
                </div>
                {!notification.read && (
                  <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(notification.created_at)}
              </p>
            </Link>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-2 border-t">
          <Link href="/settings" onClick={onClose}>
            <Button variant="ghost" size="sm" className="w-full">
              Notification Settings
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
