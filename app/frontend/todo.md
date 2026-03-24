# 九天油价预测模型 - 布伦特原油可视化交互大屏

## Design Guidelines

### Design References
- Deep dark tech dashboard style (similar to Bloomberg Terminal, TradingView dark mode)
- Oil/energy industry aesthetic with warm amber/orange accents on dark backgrounds
- Sci-fi HUD elements with glowing borders and grid patterns

### Color Palette
- Background: #0a0e1a (Deep Navy Black)
- Panel BG: #0f1525 (Dark Blue-Black)
- Panel Border: #1a2540 (Subtle Blue Border)
- Accent Primary: #f59e0b (Amber/Oil Gold)
- Accent Secondary: #3b82f6 (Tech Blue)
- Accent Bullish: #22c55e (Green - 看涨/利好)
- Accent Bearish: #ef4444 (Red - 看跌/利空)
- Text Primary: #e2e8f0 (Light Gray)
- Text Secondary: #94a3b8 (Muted Gray)
- Prediction Line: #f59e0b (Amber dashed)
- History Line: #3b82f6 (Blue solid)
- Grid Lines: #1e293b

### Typography
- Title: Inter/system font, font-weight 700, 28px
- Panel Header: font-weight 600, 16px
- Data Value: font-weight 700, 24px
- Body: font-weight 400, 13px
- Small: font-weight 400, 11px

### Key Component Styles
- Panels: Dark glass effect with subtle border glow
- Charts: Recharts with custom dark theme
- Buttons: Amber accent with glow effect
- Scrollbars: Custom thin dark scrollbars
- News cards: Dark cards with colored sentiment badges

### Images to Generate
1. **logo-oil-prediction.png** - Futuristic oil drop icon with tech circuit patterns, amber/gold color on transparent background (Style: minimalist, tech)
2. **bg-grid-pattern.png** - Subtle dark tech grid background pattern with faint blue lines (Style: minimalist, dark)
3. **bg-oil-wave.png** - Abstract oil wave pattern, dark navy with amber highlights, suitable for dashboard background accent (Style: minimalist, dark)
4. **icon-oil-barrel.png** - Stylized oil barrel icon, amber/gold, tech style on transparent background (Style: minimalist, tech)

---

## Development Tasks

### File Structure (max 8 code files)
1. `src/pages/Index.tsx` - Main dashboard page (layout container, state management)
2. `src/components/dashboard/TopNav.tsx` - Top navigation bar
3. `src/components/dashboard/BrentChart.tsx` - Left-top Brent oil price chart
4. `src/components/dashboard/IndicatorChart.tsx` - Left-bottom multi-indicator chart
5. `src/components/dashboard/NewsPanel.tsx` - Right-top news/events panel
6. `src/components/dashboard/ChatPanel.tsx` - Right-bottom AI chat panel
7. `src/components/dashboard/types.ts` - TypeScript types and mock data
8. `src/index.css` - Global dark theme styles and animations

### Data Strategy
- Use mock data for all charts and news (realistic Brent oil prices, indicators, news events)
- AI chat uses frontend client.ai.gentxt with deepseek-v3.2 model (streaming)
- No database tables needed - all data is mock/simulated for this visualization dashboard

### Key Features
- 2880x1920 viewport with responsive scaling
- Time slider for date navigation
- Daily/Weekly toggle
- USD/CNY currency toggle
- Click on chart date to update news panel
- Historical dates → Key news events (top 10, carousel)
- Today → Dynamic news with real-time feel
- Future dates → Historical similar events with mini charts
- Multi-round AI chat with preset questions