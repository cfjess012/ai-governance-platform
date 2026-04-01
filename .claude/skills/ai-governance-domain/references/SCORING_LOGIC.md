# Risk Scoring Logic

See `src/lib/classification/risk-scoring.ts` for implementation.

## Weights
- Data Sensitivity: 25% (max of selected types)
- Decision Impact: 20%
- Geographic Scope: 15% (max of selected regions)
- User Exposure: 15%
- Agent Autonomy: 15%
- Business Activity: 10%

## Score Ranges
- 0–25: Low — Standard docs, annual review
- 26–50: Moderate — Enhanced docs, semi-annual review, AI Champion
- 51–75: High — Full assessment, quarterly review, ERAI analyst
- 76–100: Critical — Executive review, monthly monitoring, bias testing
