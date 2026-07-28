export type IdaActionType =
  | "NONE"
  | "REFRESH_DASHBOARD"
  | "RECALCULATE_PAYROLL"
  | "SUBMIT_PAYROLL_APPROVAL"
  | "LOCK_PAYROLL"
  | "GENERATE_PAYSLIPS"
  | "OPEN_ADMIN_MODULE";

export type IdaConversationState = {
  conversationId: string;
  currentClientId?: string;
  currentProjectId?: string;
  currentPayrollPeriodId?: string;
  workflowStage?:
    | "SETUP"
    | "IMPORT"
    | "VALIDATION"
    | "CALCULATION"
    | "APPROVAL"
    | "PAYMENT_INSTRUCTION"
    | "PAYMENT_CONFIRMATION"
    | "REPORTING";
  pendingAction?: IdaActionProposal;
  updatedAt: string;
};

export type IdaActionProposal = {
  type: IdaActionType;
  label: string;
  description: string;
  requiresConfirmation: boolean;
  payload?: Record<string, string | number | boolean | null>;
  adminHref?: string;
};

export type IdaChatResponse = {
  reply: string;
  state: IdaConversationState;
  proposal?: IdaActionProposal;
  confirmationToken?: string;
  model?: string;
  worker?: string;
  offline?: boolean;
};

export type IdaExecuteRequest = {
  confirmationToken: string;
};

export type IdaExecuteResponse = {
  ok: boolean;
  message: string;
  refreshDashboard: boolean;
  adminHref?: string;
};
