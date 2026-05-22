

## Enhancement Trends Dashboard

A new `EnhancementTrends` component added to the Dashboard page, below UsageStats. It uses Recharts (already available via the `chart.tsx` UI component) to visualize enhancement history over time.

### What gets built

**New component: `src/components/EnhancementTrends.tsx`**

Three charts inside a tabbed glass card:

1. **Usage Over Time** — Area chart showing enhancement count per day (last 30 days), grouped from the `history` array by `created_at` date
2. **Quality Metrics Over Time** — Dual-line chart plotting average PSNR and SSIM per day (secondary Y-axis for SSIM since scales differ)
3. **Model Distribution** — Pie/donut chart showing total enhancements by model (reusing `getModelLabel`/`getModelColor` helpers)

**Integration in `src/pages/Dashboard.tsx`**
- Pass the existing `history` array as a prop to `EnhancementTrends`
- Place it between `UsageStats` and `Enhancement History` sections

### Technical details

- Uses `recharts` via the existing `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from `src/components/ui/chart.tsx`
- Data aggregation done client-side with `useMemo` — groups history items by date, computes daily counts and averages
- Tabs implemented with shadcn `Tabs` component
- Empty state when history has fewer than 2 data points
- Consistent styling: glass card, `border-border/50`, Framer Motion entry animation

