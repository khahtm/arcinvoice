'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { truncateAddress } from '@/lib/utils';
import { FileText, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { DisputeEvidence } from '@/types/database';

interface EvidenceListProps {
  evidence: DisputeEvidence[];
  onSubmit: (content: string, fileUrl?: string) => Promise<void>;
}

export function EvidenceList({ evidence, onSubmit }: EvidenceListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (content.length < 10) {
      toast.error('Please provide more details (at least 10 characters)');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(content, fileUrl || undefined);
      toast.success('Evidence submitted');
      setContent('');
      setFileUrl('');
      setIsAdding(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit evidence'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm">Evidence</h4>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Evidence list */}
      {evidence.length > 0 ? (
        <div className="space-y-2">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="border rounded p-3 text-sm space-y-1"
            >
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{truncateAddress(item.submitted_by)}</span>
                <span>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p>{item.content}</p>
              {item.file_url && (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  View attachment
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <p className="text-sm text-muted-foreground">No evidence submitted</p>
        )
      )}

      {/* Add evidence form */}
      {isAdding && (
        <div className="border rounded p-3 space-y-3">
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe your evidence..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label>File URL (optional)</Label>
            <Input
              placeholder="https://..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
