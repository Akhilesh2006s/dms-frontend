# AI Test Data Seeding

This script generates 500 test records for each data type needed by the AI tools.

## What It Seeds

- **500 Leads** - For Deal Risk Scoring, Revenue at Risk, Priority Engine
- **500 Sales** - For Revenue at Risk, Executive Dashboard, Deal Risk
- **500 Payments** - For Revenue at Risk, Cashflow Analyzer, Fraud Detection
- **500 DCs (Delivery Challans)** - For Delay Cost Calculator, Priority Engine
- **500 Expenses** - For Fraud Detection
- **500 DC Orders** - For additional testing
- **20 Managers/Executives** - For Performance Risk Index

## How to Run

```bash
cd backend
npm run seed:ai-data
```

Or directly:

```bash
cd backend
node scripts/seedAITestData.js
```

## What It Does

1. Connects to your MongoDB database
2. Creates 20 test managers/executives (if they don't exist)
3. Generates 500 records for each data type with:
   - Realistic dates (last 6 months)
   - Random amounts, statuses, priorities
   - Proper relationships between records
   - Timezone-aware timestamps

## Data Characteristics

- **Leads**: Mix of Pending, Processing, Saved, Closed statuses
- **Sales**: Various statuses with payment information
- **Payments**: Mix of Pending, Approved, Hold, Rejected
- **DCs**: Various stages from created to completed
- **Expenses**: Different categories and approval statuses
- **Dates**: Spread over last 6 months for time-series analysis

## Notes

- The script will not duplicate existing managers (checks by email)
- All dates are properly formatted for timezone-aware operations
- Data is linked properly (sales linked to leads, payments linked to sales, etc.)
- Amounts are realistic (₹5,000 to ₹200,000 range)

## After Seeding

Once seeded, you can test all AI tools:
- Revenue at Risk Engine
- Executive Dashboard
- Priority Engine
- Deal Risk Scoring
- Performance Risk Index
- Fraud Detection
- Cashflow Analyzer
- Delay Cost Calculator
- Churn Predictor
- Narrative BI

All tools will now have sufficient data (500+ records) to provide meaningful insights!
