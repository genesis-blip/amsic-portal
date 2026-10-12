export interface Hotline { label: string; number: string; tel: string; note?: string; urgent?: boolean }

export const HOTLINES: Hotline[] = [
  { label: 'National emergency', number: '911', tel: '911', note: 'Police, fire, ambulance', urgent: true },
  { label: 'Barangay Amsic Hall', number: '0953 006 2436', tel: '09530062436', note: 'Barangay staff and tanod' },
  { label: 'Fire station', number: '(045) 322-6758', tel: '0453226758', note: 'Bureau of Fire Protection' },
  { label: 'PNP Angeles City', number: '(045) 322-0485', tel: '0453220485', note: 'Police' },
  { label: 'Health center', number: '(045) 455-2222', tel: '0454552222', note: 'Medical help and referrals' },
  { label: 'NDRRMC', number: '(02) 8911-5061 to 65', tel: '0289115061', note: 'Disasters, floods, typhoons' },
];

export const BARANGAY_HALL = HOTLINES[1];
