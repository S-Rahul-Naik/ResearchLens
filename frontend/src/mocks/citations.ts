export interface Citation {
  from: string;
  to: string;
}

export const mockCitations: Citation[] = [
  { from: 'p003', to: 'p008' },
  { from: 'p005', to: 'p015' },
  { from: 'p005', to: 'p003' },
  { from: 'p007', to: 'p001' },
  { from: 'p007', to: 'p015' },
  { from: 'p014', to: 'p001' },
  { from: 'p016', to: 'p003' },
  { from: 'p016', to: 'p011' },
  { from: 'p017', to: 'p009' },
  { from: 'p012', to: 'p018' },
  { from: 'p013', to: 'p009' },
  { from: 'p019', to: 'p004' },
  { from: 'p006', to: 'p002' },
  { from: 'p010', to: 'p002' },
  { from: 'p018', to: 'p006' },
  { from: 'p020', to: 'p001' },
  { from: 'p009', to: 'p004' },
  { from: 'p013', to: 'p004' },
  { from: 'p017', to: 'p008' },
  { from: 'p012', to: 'p009' },
];
