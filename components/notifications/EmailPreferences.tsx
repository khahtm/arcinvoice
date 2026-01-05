'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferences {
  email?: string;
  email_verified?: boolean;
  notify_payment_received?: boolean;
  notify_escrow_funded?: boolean;
  notify_milestone_approved?: boolean;
  notify_dispute_opened?: boolean;
  notify_marketing?: boolean;
}

export function EmailPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences || {});
        setEmail(data.preferences?.email || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);

        if (updates.email && updates.email !== prefs.email) {
          toast.success('Verification email sent! Check your inbox.');
        } else {
          toast.success('Preferences saved');
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      savePreferences({ email });
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    savePreferences({ [key]: !prefs[key] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email address */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <Label htmlFor="email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={isSaving || email === prefs.email}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {prefs.email && (
            <div className="flex items-center gap-2">
              {prefs.email_verified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">Pending verification</Badge>
              )}
            </div>
          )}
        </form>

        {/* Notification toggles */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Types</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Payment Received</Label>
                <p className="text-sm text-muted-foreground">
                  When someone pays your invoice
                </p>
              </div>
              <Switch
                checked={prefs.notify_payment_received ?? true}
                onCheckedChange={() => togglePreference('notify_payment_received')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Escrow Funded</Label>
                <p className="text-sm text-muted-foreground">
                  When escrow is funded
                </p>
              </div>
              <Switch
                checked={prefs.notify_escrow_funded ?? true}
                onCheckedChange={() => togglePreference('notify_escrow_funded')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Milestone Approved</Label>
                <p className="text-sm text-muted-foreground">
                  When a milestone is approved
                </p>
              </div>
              <Switch
                checked={prefs.notify_milestone_approved ?? true}
                onCheckedChange={() => togglePreference('notify_milestone_approved')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Disputes</Label>
                <p className="text-sm text-muted-foreground">
                  When a dispute is opened or updated
                </p>
              </div>
              <Switch
                checked={prefs.notify_dispute_opened ?? true}
                onCheckedChange={() => togglePreference('notify_dispute_opened')}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <Label>Marketing Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Product updates and tips
                </p>
              </div>
              <Switch
                checked={prefs.notify_marketing ?? false}
                onCheckedChange={() => togglePreference('notify_marketing')}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
