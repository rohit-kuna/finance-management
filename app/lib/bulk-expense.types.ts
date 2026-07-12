export type BulkAddRowDto = {
  clientId: string;
  date: string;               // YYYY-MM-DD for <input type="date">
  amount: string;             // "250.00"
  type: "expense" | "income";
  userCategoryId: number | null;  // null = name not matched in your personal space
  userCategoryName: string;       // raw from Excel — shown as hint when unresolved
  spaceCategoryName: string;      // informational hint only; not stored on the transaction
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
  userCategoryId: number;
  type: "expense" | "income";
  transactionModeId: number;
  counterPartyId: number | null;
  amount: string;
  necessityScore: number;
  note: string | null;
  tagIds: number[];
  occurredAt: string; // YYYY-MM-DD
};
