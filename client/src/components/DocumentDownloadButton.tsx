import { useState } from 'react';
import { Eye, FileDown } from 'lucide-react';
import { downloadFile } from '../lib/download';
import { parseApiError } from '../lib/http';
import { useToast } from '../hooks/useToast';
import type { DocumentRequest } from '../types';

interface Props { path: string; request: DocumentRequest; label?: string; className?: string; open?: boolean }

export function DocumentDownloadButton({ path, request, label = 'Download PDF', className = 'btn-primary', open = false }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await downloadFile(path, `${request.documentType.name} - ${request.referenceNumber}.pdf`, open);
      if (!open) toast.success('Document downloaded');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setBusy(false);
    }
  };
  const Icon = open ? Eye : FileDown;
  return (
    <button type="button" className={className} disabled={busy} onClick={() => void onClick()}>
      <Icon className="h-5 w-5" aria-hidden /> {busy ? 'Preparing PDF…' : label}
    </button>
  );
}
