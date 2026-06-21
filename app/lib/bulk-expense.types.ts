export type BulkAddRowDto = {
  clientId: string;
  date: string;               // YYYY-MM-DD for <input type="date">
  amount: string;             // "250.00"
  categoryId: number | null;  // null = name not matched in org
  categoryName: string;       // raw from Excel — shown as hint when unresolved
  subcategoryId: number | null;
  subcategoryName: string;
  modeId: number | null;      // null = name not matched; will default to user's default mode
  modeName: string;
  counterPartyId: number | null;
  counterPartyName: string;
  note: string;
  tagIds: number[];
  necessityScore: number;     // -1/0/1, default 0
  issues: string[];           // parse-time warnings to display
};

export type BulkCreateInput = {
  categoryId: number;
  subcategoryId: number | null;
  transactionModeId: number;
  counterPartyId: number | null;
  amount: string;
  necessityScore: number;
  note: string | null;
  tagIds: number[];
  occurredAt: string; // YYYY-MM-DD
};
