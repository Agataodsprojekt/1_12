import { Costs } from '../types/ifc';
import { DollarSign } from 'lucide-react';

interface CostSummaryProps {
  costs: Costs | null;
}

export function CostSummary({ costs }: CostSummaryProps) {
  if (!costs?.summary) {
    return (
      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        Koszty nie zostały obliczone. Parsowanie zakończone sukcesem.
      </div>
    );
  }

  const { summary } = costs;
  const formatCurrency = (value: number) =>
    value.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Koszt Projektu</h3>
      </div>
      
      <div className="text-center p-4 bg-background/50 rounded-lg">
        <div className="text-3xl font-bold text-primary">
          {formatCurrency(summary.grand_total)} PLN
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 bg-background/30 rounded">
          <span className="text-sm font-medium">Materiały:</span>
          <span className="text-sm font-semibold">
            {formatCurrency(summary.total_material_cost)} PLN
          </span>
        </div>
        <div className="flex justify-between items-center p-2 bg-background/30 rounded">
          <span className="text-sm font-medium">Złącza:</span>
          <span className="text-sm font-semibold">
            {formatCurrency(summary.total_connection_cost)} PLN
          </span>
        </div>
        {summary.total_labor_cost > 0 && (
          <div className="flex justify-between items-center p-2 bg-background/30 rounded">
            <span className="text-sm font-medium">Robocizna:</span>
            <span className="text-sm font-semibold">
              {formatCurrency(summary.total_labor_cost)} PLN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

