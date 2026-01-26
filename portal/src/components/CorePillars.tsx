/**
 * CorePillars Component
 *
 * Minimal stats row showing Documents, Mockups, Structure counts.
 * Devin-style dark gray monochrome aesthetic.
 */

import {
  FileText,
  Layout,
  FolderTree,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  title: string;
  path: string;
  type: string;
}

interface Mockup {
  name: string;
  path: string;
  screens?: number;
}

interface CorePillarsProps {
  documents: Document[];
  mockups: Mockup[];
  structureScore: number;
  suggestionsCount: number;
  onViewDocuments?: () => void;
  onViewMockups?: () => void;
  onViewSuggestions?: () => void;
}

export function CorePillars({
  documents,
  mockups,
  structureScore,
  suggestionsCount,
  onViewDocuments,
  onViewMockups,
  onViewSuggestions
}: CorePillarsProps) {
  const pillars = [
    {
      id: 'documents',
      icon: FileText,
      label: 'Docs',
      value: documents.length,
      subtext: documents.length === 1 ? 'file' : 'files',
      isGood: documents.length > 0,
      onClick: onViewDocuments
    },
    {
      id: 'mockups',
      icon: Layout,
      label: 'Mockups',
      value: mockups.length,
      subtext: mockups.length === 1 ? 'screen' : 'screens',
      isGood: mockups.length > 0,
      onClick: onViewMockups
    },
    {
      id: 'structure',
      icon: FolderTree,
      label: 'Structure',
      value: `${structureScore}%`,
      subtext: suggestionsCount > 0 ? `${suggestionsCount} suggestions` : 'compliant',
      isGood: structureScore >= 80,
      onClick: onViewSuggestions
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {pillars.map((pillar) => {
        const Icon = pillar.icon;

        return (
          <button
            key={pillar.id}
            onClick={pillar.onClick}
            className="p-4 rounded-lg border text-left transition-colors bg-[#1e1e1e] border-[#2e2e2e] hover:border-[#2e2e2e] hover:bg-[#2e2e2e]"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={cn("h-4 w-4", pillar.isGood ? "text-[#5a9a5a]" : "text-[#a3a3a3]")} />
              {pillar.isGood && (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#5a9a5a]" />
              )}
            </div>
            <div className="text-xl font-semibold text-[#fafafa] tabular-nums">
              {pillar.value}
            </div>
            <div className="text-xs text-[#a3a3a3] mt-0.5">
              {pillar.label} · {pillar.subtext}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default CorePillars;
