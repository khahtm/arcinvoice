'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useKleros } from '@/hooks/useKleros';
import { Upload, Loader2, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ipfsToHttp } from '@/lib/kleros/evidence';

interface KlerosEvidenceFormProps {
  invoiceId: string;
  disputeId: string;
}

export function KlerosEvidenceForm({ invoiceId, disputeId }: KlerosEvidenceFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { klerosCase, evidence, submitEvidence } = useKleros(invoiceId, disputeId);

  // Don't show if no Kleros case or evidence period ended
  if (!klerosCase) return null;

  const canSubmit =
    klerosCase.status === 'pending' ||
    (klerosCase.status === 'evidence' &&
      klerosCase.evidence_deadline &&
      new Date(klerosCase.evidence_deadline) > new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEvidence(name.trim(), description.trim(), fileUri.trim() || undefined);
      toast.success('Evidence submitted');
      setName('');
      setDescription('');
      setFileUri('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h4 className="font-medium flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Evidence Submissions
      </h4>

      {/* Existing evidence */}
      {evidence.length > 0 && (
        <div className="space-y-2">
          {evidence.map((e) => (
            <div key={e.id} className="text-sm bg-muted p-2 rounded flex justify-between">
              <span className="truncate">{e.evidence_uri}</span>
              {e.evidence_uri.startsWith('ipfs://') && (
                <a
                  href={ipfsToHttp(e.evidence_uri)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0 ml-2"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit form */}
      {canSubmit ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="evidence-name">Evidence Title</Label>
            <Input
              id="evidence-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Contract Agreement"
              required
            />
          </div>

          <div>
            <Label htmlFor="evidence-description">Description</Label>
            <Textarea
              id="evidence-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this evidence shows..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="evidence-file">File URL (optional)</Label>
            <Input
              id="evidence-file"
              value={fileUri}
              onChange={(e) => setFileUri(e.target.value)}
              placeholder="https://... or ipfs://..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Link to supporting document (PDF, image, etc.)
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Submit Evidence
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {klerosCase.status === 'resolved'
            ? 'Case has been resolved. Evidence period closed.'
            : 'Evidence submission period has ended.'}
        </p>
      )}
    </Card>
  );
}
