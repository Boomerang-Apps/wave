/**
 * MarkdownPreviewModal Component
 *
 * Modal to preview and download markdown files
 */

import { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface MarkdownPreviewModalProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
}

export function MarkdownPreviewModal({
  filePath,
  fileName,
  onClose
}: MarkdownPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch markdown content
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/read-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        });

        if (!response.ok) {
          throw new Error('Failed to load file');
        }

        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filePath]);

  // Handle download
  const handleDownload = () => {
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open in VS Code
  const handleOpenInEditor = () => {
    window.open(`vscode://file${filePath}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#888]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#fafafa]">{fileName}</h2>
              <p className="text-xs text-[#666] truncate max-w-[400px]">{filePath}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInEditor}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2e2e2e] text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#3e3e3e] transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Editor
            </button>
            <button
              onClick={handleDownload}
              disabled={!content}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#2e2e2e] text-[#666] hover:text-[#fafafa] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#666] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[#dc2626]">{error}</p>
            </div>
          ) : (
            <pre className="text-sm text-[#a3a3a3] font-mono whitespace-pre-wrap leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarkdownPreviewModal;
