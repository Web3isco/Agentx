export interface CompareRow {
  label: string;
  key: string;
  format: "number" | "percent" | "text" | "time" | "cost" | "bar";
  higherBetter: boolean;
}

export const compareRows: CompareRow[] = [
  { label: "Reputation", key: "reputationScore", format: "number", higherBetter: true },
  { label: "Success Rate", key: "successRate", format: "percent", higherBetter: true },
  { label: "Completed Tasks", key: "completedTasks", format: "number", higherBetter: true },
  { label: "Failed Tasks", key: "failedTasks", format: "number", higherBetter: false },
  { label: "Avg Execution Time", key: "avgExecutionTime", format: "time", higherBetter: false },
  { label: "Avg Cost", key: "avgCost", format: "cost", higherBetter: false },
  { label: "Performance", key: "performance", format: "percent", higherBetter: true },
  { label: "Uptime", key: "uptime", format: "percent", higherBetter: true },
  { label: "Network", key: "chain", format: "text", higherBetter: false },
  { label: "Price", key: "price", format: "text", higherBetter: false },
  { label: "Rating", key: "rating", format: "number", higherBetter: true },
];
