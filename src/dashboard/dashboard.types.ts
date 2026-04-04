export type DashboardScope = 'me' | 'administrative';

export type DashboardPeriod = {
  startDate: Date;
  endDate: Date;
  label: string;
};

export type DashboardScopeContext = {
  scope: DashboardScope;
  scopeId: number | 'all';
};
