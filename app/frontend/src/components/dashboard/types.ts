// ==================== Types ====================

export interface BrentDataPoint {
  date: string; // YYYY-MM-DD
  price: number;
  isPredict: boolean;
  predictPrice?: number; // model prediction value for this date (both historical and future)
}

export interface IndicatorDataPoint {
  date: string;
  value: number;
  isPredict?: boolean;
  predictValue?: number; // model prediction value for this date
}

export interface IndicatorInfo {
  key: string;
  name: string;
  unit: string;
  color: string;
  data: IndicatorDataPoint[];
}

export interface NewsItem {
  id: number;
  source: string;
  title: string;
  date: string;
  sentiment: '利好' | '利空';
  changePercent: string;
  summary: string;
  weight?: number;
}

export interface SimilarEvent {
  id: number;
  title: string;
  similarity: number;
  periodStart: string;
  periodEnd: string;
  chartData: { week: string; actual: number; predicted: number }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ==================== Constants ====================

export const TODAY = '2026-03-20';
export const USD_TO_CNY = 7.25;
export const DEFAULT_PREDICT_DAYS = 42; // 6 weeks

// ==================== Helper: format date ====================
function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Fill gaps in date series - ensure every day has data
function fillGaps<T extends { date: string }>(
  data: T[],
  interpolate: (prev: T, next: T, date: string) => T
): T[] {
  if (data.length < 2) return data;
  const filled: T[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i - 1].date);
    const currDate = new Date(data[i].date);
    // Fill any missing days between prev and curr
    const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
    if (daysDiff > 1) {
      for (let d = 1; d < daysDiff; d++) {
        const gapDate = new Date(prevDate);
        gapDate.setDate(gapDate.getDate() + d);
        filled.push(interpolate(data[i - 1], data[i], fmtDate(gapDate)));
      }
    }
    filled.push(data[i]);
  }
  return filled;
}

// ==================== Mock Data Generators ====================

// Use seeded-like approach with fixed seed for consistency
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateBrentData(): BrentDataPoint[] {
  const data: BrentDataPoint[] = [];
  const today = new Date(TODAY);
  const startDate = new Date('2025-01-01');
  const rand = seededRandom(42);

  // Generate a separate prediction random stream with a different seed
  const predRand = seededRandom(777);

  let price = 72.5;
  let predPrice = 72.5; // prediction model starts at same base
  const current = new Date(startDate);
  while (current <= today) {
    const change = (rand() - 0.48) * 3.5;
    price = Math.max(55, Math.min(95, price + change));

    // Prediction model: follows real price with some noise/lag
    const predChange = (predRand() - 0.48) * 3.0;
    // Prediction tends to drift toward real price but with delay
    predPrice = predPrice + predChange + (price - predPrice) * 0.15;
    predPrice = Math.max(55, Math.min(95, predPrice));

    data.push({
      date: fmtDate(current),
      price: Math.round(price * 100) / 100,
      predictPrice: Math.round(predPrice * 100) / 100,
      isPredict: false,
    });
    current.setDate(current.getDate() + 1);
  }

  // Prediction data (default 42 days = 6 weeks) - future dates only have prediction
  let futPredPrice = price;
  for (let i = 1; i <= DEFAULT_PREDICT_DAYS; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    const change = (rand() - 0.45) * 2.8;
    futPredPrice = Math.max(55, Math.min(95, futPredPrice + change));
    data.push({
      date: fmtDate(futureDate),
      price: Math.round(futPredPrice * 100) / 100,
      predictPrice: Math.round(futPredPrice * 100) / 100, // future: predict = price
      isPredict: true,
    });
  }

  // Fill any gaps
  return fillGaps(data, (prev, next, date) => ({
    date,
    price: Math.round(((prev.price + next.price) / 2) * 100) / 100,
    predictPrice: Math.round((((prev.predictPrice || prev.price) + (next.predictPrice || next.price)) / 2) * 100) / 100,
    isPredict: prev.isPredict,
  }));
}

function generateIndicatorData(
  baseValue: number,
  volatility: number,
  min: number,
  max: number,
  seed: number
): IndicatorDataPoint[] {
  const data: IndicatorDataPoint[] = [];
  const startDate = new Date('2025-01-01');
  const today = new Date(TODAY);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + DEFAULT_PREDICT_DAYS);
  const rand = seededRandom(seed);
  const predRand = seededRandom(seed + 500); // different seed for prediction
  let value = baseValue;
  let predValue = baseValue;
  const current = new Date(startDate);

  while (current <= endDate) {
    const change = (rand() - 0.5) * volatility;
    value = Math.max(min, Math.min(max, value + change));

    const isFuture = current > today;
    // Prediction model: follows real with noise/lag for historical, same for future
    const predChange = (predRand() - 0.5) * volatility * 0.9;
    predValue = predValue + predChange + (value - predValue) * 0.12;
    predValue = Math.max(min, Math.min(max, predValue));

    data.push({
      date: fmtDate(current),
      value: Math.round(value * 100) / 100,
      isPredict: isFuture,
      predictValue: Math.round((isFuture ? value : predValue) * 100) / 100,
    });
    current.setDate(current.getDate() + 1);
  }

  // Fill any gaps
  return fillGaps(data, (prev, next, date) => ({
    date,
    value: Math.round(((prev.value + next.value) / 2) * 100) / 100,
    isPredict: prev.isPredict,
    predictValue: Math.round((((prev.predictValue || prev.value) + (next.predictValue || next.value)) / 2) * 100) / 100,
  }));
}

export const INDICATORS: IndicatorInfo[] = [
  { key: 'wti', name: 'WTI', unit: 'Dollars per Barrel', color: '#f97316', data: generateIndicatorData(68, 3.2, 50, 90, 101) },
  { key: 'usd_index', name: '美元指数', unit: 'Index', color: '#06b6d4', data: generateIndicatorData(120, 1.5, 100, 140, 102) },
  { key: 'effr', name: 'EFFR', unit: 'Percent', color: '#a855f7', data: generateIndicatorData(4.5, 0.1, 3.0, 6.0, 103) },
  { key: 'usd_cny', name: '美元-人民币', unit: 'CNY/USD', color: '#ec4899', data: generateIndicatorData(7.25, 0.05, 6.8, 7.6, 104) },
  { key: 'nasdaq', name: '纳斯达克', unit: 'Index', color: '#22c55e', data: generateIndicatorData(16500, 300, 14000, 19000, 105) },
  { key: 'sp500', name: 'S&P 500', unit: 'Index', color: '#eab308', data: generateIndicatorData(5200, 100, 4500, 6000, 106) },
  { key: 'ovx', name: 'CBOE波动率', unit: 'Index', color: '#ef4444', data: generateIndicatorData(32, 4, 18, 55, 107) },
];

export const BRENT_DATA = generateBrentData();

// ==================== Week Helpers ====================

/** Get Monday of the week for a given date */
export function getWeekMonday(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

/** Get Sunday of the week for a given date */
export function getWeekSunday(dateStr: string): Date {
  const monday = getWeekMonday(dateStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

/** Format week label: "MM.DD-MM.DD" */
export function formatWeekLabel(dateStr: string): string {
  const mon = getWeekMonday(dateStr);
  const sun = getWeekSunday(dateStr);
  const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `${fmt(mon)}-${fmt(sun)}`;
}

// ==================== News Mock Data ====================

// Rich date-specific news database: each date has 10+ unique events
const dateNewsDatabase: Record<string, Omit<NewsItem, 'id'>[]> = {
  '2026-03-20': [
    { source: '汇通财经', title: '霍尔木兹海峡航运受阻推高油价', date: '2026-03-20', sentiment: '利好', changePercent: '+3.2%', summary: '关键通道中断：霍尔木兹海峡航运活动近乎停滞，全球油轮运费飙升。', weight: 95 },
    { source: '汇通财经', title: '美以伊冲突升级引发供应担忧', date: '2026-03-20', sentiment: '利好', changePercent: '+2.8%', summary: '伊朗封锁海峡取决于外界对其石油出口施压的程度，中东局势持续紧张。', weight: 90 },
    { source: 'Reuters', title: 'OPEC+紧急会议讨论增产方案', date: '2026-03-20', sentiment: '利空', changePercent: '-1.5%', summary: 'OPEC+成员国就是否增产展开激烈讨论，沙特态度软化。', weight: 85 },
    { source: 'Bloomberg', title: '美国战略石油储备释放500万桶', date: '2026-03-20', sentiment: '利空', changePercent: '-2.1%', summary: '美国能源部宣布释放战略石油储备以平抑油价。', weight: 80 },
    { source: 'CNBC', title: '全球经济增长预期上调提振需求', date: '2026-03-20', sentiment: '利好', changePercent: '+1.2%', summary: 'IMF上调2026年全球GDP增长预期至3.4%。', weight: 70 },
    { source: 'FT', title: '伊朗核谈判破裂加剧制裁预期', date: '2026-03-20', sentiment: '利好', changePercent: '+2.4%', summary: '伊朗与西方国家核谈判再次破裂，新一轮制裁可能进一步限制伊朗石油出口。', weight: 88 },
    { source: 'Oilprice', title: '北海Forties管道系统临时关闭', date: '2026-03-20', sentiment: '利好', changePercent: '+1.6%', summary: '英国北海Forties管道因技术故障关闭48小时，影响日输送量45万桶。', weight: 76 },
    { source: '新华社', title: '中国3月原油进口量同比增长12%', date: '2026-03-20', sentiment: '利好', changePercent: '+0.9%', summary: '海关数据显示中国3月原油进口达1180万桶/日。', weight: 65 },
    { source: 'Bloomberg', title: '全球石油期货未平仓合约创新高', date: '2026-03-20', sentiment: '利好', changePercent: '+0.7%', summary: 'ICE布伦特原油期货未平仓合约升至320万手，市场参与度显著提升。', weight: 58 },
    { source: 'CNBC', title: '美国炼油厂利润率大幅回升', date: '2026-03-20', sentiment: '利好', changePercent: '+0.5%', summary: '美国墨西哥湾沿岸炼油厂裂解价差升至28美元/桶。', weight: 52 },
    { source: 'Reuters', title: '挪威石油工人罢工威胁升级', date: '2026-03-20', sentiment: '利好', changePercent: '+1.8%', summary: '挪威石油工人工会与雇主谈判破裂，可能影响北海产量。', weight: 74 },
  ],
  '2026-03-19': [
    { source: 'Oilprice', title: '利比亚最大油田因抗议停产', date: '2026-03-19', sentiment: '利好', changePercent: '+4.1%', summary: '利比亚Sharara油田因当地武装冲突被迫关闭，日产量减少30万桶。', weight: 92 },
    { source: 'Reuters', title: '俄罗斯原油出口量降至18个月低点', date: '2026-03-19', sentiment: '利好', changePercent: '+2.3%', summary: '制裁加码导致俄罗斯海运原油出口大幅下滑。', weight: 88 },
    { source: 'FT', title: '欧洲天然气价格飙升带动油价', date: '2026-03-19', sentiment: '利好', changePercent: '+1.7%', summary: '欧洲TTF天然气期货价格突破45欧元/兆瓦时。', weight: 75 },
    { source: 'Bloomberg', title: '美国页岩油产量增速放缓', date: '2026-03-19', sentiment: '利好', changePercent: '+0.9%', summary: '二叠纪盆地新井完工数连续3个月下降。', weight: 68 },
    { source: '新华社', title: '印度炼油需求创历史新高', date: '2026-03-19', sentiment: '利好', changePercent: '+1.1%', summary: '印度3月原油进口量达到540万桶/日，同比增长8%。', weight: 65 },
    { source: 'CNBC', title: '对冲基金大幅增持原油多头', date: '2026-03-19', sentiment: '利好', changePercent: '+0.6%', summary: '投机性净多头头寸升至6个月高位。', weight: 55 },
    { source: '汇通财经', title: '也门胡塞武装袭击红海油轮', date: '2026-03-19', sentiment: '利好', changePercent: '+2.6%', summary: '胡塞武装再次袭击红海商船，多家航运公司暂停红海航线。', weight: 85 },
    { source: 'Oilprice', title: '加拿大跨山管道扩建完工投产', date: '2026-03-19', sentiment: '利空', changePercent: '-0.8%', summary: '加拿大跨山管道扩建项目正式投产，日输送能力增至89万桶。', weight: 62 },
    { source: 'Bloomberg', title: '全球石油浮仓库存降至年内低点', date: '2026-03-19', sentiment: '利好', changePercent: '+0.4%', summary: '海上浮仓原油库存降至7800万桶，较上月减少15%。', weight: 50 },
    { source: 'FT', title: '欧盟讨论对俄石油价格上限下调', date: '2026-03-19', sentiment: '利好', changePercent: '+1.3%', summary: '欧盟成员国讨论将俄罗斯石油价格上限从60美元下调至50美元。', weight: 72 },
    { source: 'Reuters', title: '墨西哥国家石油公司债务危机', date: '2026-03-19', sentiment: '利好', changePercent: '+0.7%', summary: 'Pemex债务评级再遭下调，产量持续下滑至150万桶/日。', weight: 58 },
  ],
  '2026-03-18': [
    { source: 'Oilprice', title: 'Trump承诺增产压低油价预期', date: '2026-03-18', sentiment: '利空', changePercent: '-2.5%', summary: 'Trump签署行政令加速联邦土地钻探许可审批。', weight: 85 },
    { source: 'Reuters', title: '美元指数走强打压油价', date: '2026-03-18', sentiment: '利空', changePercent: '-1.8%', summary: '美元指数升至106.5，创3个月新高。', weight: 78 },
    { source: 'Bloomberg', title: '中国制造业PMI低于预期', date: '2026-03-18', sentiment: '利空', changePercent: '-1.3%', summary: '中国3月制造业PMI为49.2，连续第二个月收缩。', weight: 72 },
    { source: 'FT', title: 'Venture Global LNG项目获批', date: '2026-03-18', sentiment: '利好', changePercent: '+0.8%', summary: 'LNG producer Venture Global raised $1.75 billion in IPO.', weight: 60 },
    { source: 'CNBC', title: '美国汽油库存大幅增加', date: '2026-03-18', sentiment: '利空', changePercent: '-1.1%', summary: 'EIA数据显示汽油库存增加420万桶，需求疲软信号明显。', weight: 70 },
    { source: '新华社', title: '中国成品油出口配额大幅增加', date: '2026-03-18', sentiment: '利空', changePercent: '-0.9%', summary: '商务部下发第二批成品油出口配额1500万吨，同比增长25%。', weight: 65 },
    { source: '汇通财经', title: '伊拉克南部港口恢复正常装载', date: '2026-03-18', sentiment: '利空', changePercent: '-0.7%', summary: '巴士拉港口此前因恶劣天气暂停的装载作业已全面恢复。', weight: 55 },
    { source: 'Bloomberg', title: '全球航空燃油需求低于季节性水平', date: '2026-03-18', sentiment: '利空', changePercent: '-0.5%', summary: '国际航空运输协会数据显示全球航空客运量恢复不及预期。', weight: 48 },
    { source: 'Oilprice', title: '巴西Petrobras上调产量目标', date: '2026-03-18', sentiment: '利空', changePercent: '-1.0%', summary: '巴西国家石油公司将2026年产量目标上调至280万桶/日。', weight: 68 },
    { source: 'Reuters', title: '国际能源署下调需求增长预期', date: '2026-03-18', sentiment: '利空', changePercent: '-1.6%', summary: 'IEA将2026年全球石油需求增长预期下调20万桶/日至90万桶/日。', weight: 82 },
    { source: 'FT', title: '欧洲工业用油需求持续萎缩', date: '2026-03-18', sentiment: '利空', changePercent: '-0.4%', summary: '欧元区工业产出连续第五个月下降，石化行业需求疲弱。', weight: 45 },
  ],
  '2026-03-17': [
    { source: 'Reuters', title: 'OPEC+减产协议延长至Q2', date: '2026-03-17', sentiment: '利好', changePercent: '+2.1%', summary: 'OPEC+成员国一致同意延长减产协议至2026年Q2末。', weight: 92 },
    { source: 'Bloomberg', title: '尼日利亚管道爆炸导致出口中断', date: '2026-03-17', sentiment: '利好', changePercent: '+3.5%', summary: 'Forcados终端管道遭袭击，日出口减少25万桶。', weight: 88 },
    { source: '新华社', title: '中国宣布增加原油战略储备', date: '2026-03-17', sentiment: '利好', changePercent: '+1.4%', summary: '中国计划在Q2增购2000万桶原油充实战略储备。', weight: 75 },
    { source: 'CNBC', title: '美国汽油需求季节性回升', date: '2026-03-17', sentiment: '利好', changePercent: '+0.7%', summary: '春季出行旺季临近，美国汽油需求周环比增长3.2%。', weight: 62 },
    { source: 'Oilprice', title: '加拿大油砂项目投资缩减', date: '2026-03-17', sentiment: '利好', changePercent: '+0.5%', summary: '多家加拿大油砂企业宣布削减2026年资本支出。', weight: 55 },
    { source: 'FT', title: '沙特削减对美原油出口量', date: '2026-03-17', sentiment: '利好', changePercent: '+1.8%', summary: '沙特阿美通知美国客户4月原油供应将减少15%。', weight: 82 },
    { source: '汇通财经', title: '科威特油田因设备故障减产', date: '2026-03-17', sentiment: '利好', changePercent: '+1.2%', summary: '科威特Burgan油田关键设备故障导致日产量减少8万桶。', weight: 70 },
    { source: 'Bloomberg', title: '原油期货曲线转向现货溢价', date: '2026-03-17', sentiment: '利好', changePercent: '+0.9%', summary: 'Brent期货曲线从期货溢价转向现货溢价，反映供应趋紧。', weight: 65 },
    { source: 'Reuters', title: '土耳其关闭伊拉克-杰伊汉管道', date: '2026-03-17', sentiment: '利好', changePercent: '+2.6%', summary: '土耳其因维护关闭BTC管道，影响日输送量50万桶。', weight: 85 },
    { source: '新华社', title: '亚洲石脑油裂解价差走强', date: '2026-03-17', sentiment: '利好', changePercent: '+0.4%', summary: '亚洲石化行业开工率提升推动石脑油需求增长。', weight: 48 },
    { source: 'CNBC', title: '全球石油钻机总数降至两年低点', date: '2026-03-17', sentiment: '利好', changePercent: '+0.6%', summary: 'Baker Hughes数据显示全球石油钻机总数降至1650座。', weight: 52 },
  ],
  '2026-03-16': [
    { source: 'Bloomberg', title: '美国原油库存意外下降580万桶', date: '2026-03-16', sentiment: '利好', changePercent: '+1.8%', summary: 'EIA周报数据显示原油库存大幅下降，远超市场预期的减少150万桶。', weight: 88 },
    { source: 'FT', title: '全球航运保险费率飙升300%', date: '2026-03-16', sentiment: '利空', changePercent: '-4.5%', summary: '红海局势恶化导致霍尔木兹海峡油轮保险费率暴涨。', weight: 82 },
    { source: 'Reuters', title: '伊拉克库尔德地区恢复出口谈判', date: '2026-03-16', sentiment: '利空', changePercent: '-1.2%', summary: '伊拉克与土耳其就恢复库尔德地区原油出口达成初步协议。', weight: 70 },
    { source: 'CNBC', title: '美国天然气价格暴跌拖累能源板块', date: '2026-03-16', sentiment: '利空', changePercent: '-0.8%', summary: 'Henry Hub天然气价格跌至1.8美元/百万英热单位。', weight: 55 },
    { source: '新华社', title: '中国独立炼厂原油配额用尽', date: '2026-03-16', sentiment: '利空', changePercent: '-0.6%', summary: '山东地炼企业第一批原油进口配额已基本用完。', weight: 50 },
    { source: 'Oilprice', title: '厄瓜多尔恢复满负荷石油生产', date: '2026-03-16', sentiment: '利空', changePercent: '-0.9%', summary: '厄瓜多尔此前因管道维修减产的产量已完全恢复。', weight: 58 },
    { source: 'Bloomberg', title: '全球柴油库存处于五年高位', date: '2026-03-16', sentiment: '利空', changePercent: '-1.1%', summary: '新加坡、ARA和美国墨西哥湾柴油库存均高于季节性水平。', weight: 65 },
    { source: '汇通财经', title: '沙特阿美发现新天然气田', date: '2026-03-16', sentiment: '利空', changePercent: '-0.3%', summary: '沙特阿美在Jafurah盆地发现大型非常规天然气田。', weight: 42 },
    { source: 'FT', title: '英国石油公司BP裁员2000人', date: '2026-03-16', sentiment: '利好', changePercent: '+0.5%', summary: 'BP宣布全球裁员计划，反映上游投资收缩趋势。', weight: 48 },
    { source: 'Reuters', title: '阿尔及利亚提高对欧天然气供应', date: '2026-03-16', sentiment: '利空', changePercent: '-0.4%', summary: '阿尔及利亚通过TransMed管道增加对意大利天然气输送量。', weight: 45 },
  ],
  '2026-03-15': [
    { source: '新华社', title: '中国炼油厂开工率创新高89%', date: '2026-03-15', sentiment: '利好', changePercent: '+0.9%', summary: '中国主要炼油厂3月开工率达到89%，同比提升5个百分点。', weight: 72 },
    { source: 'CNBC', title: '美联储暗示暂停加息利好油市', date: '2026-03-15', sentiment: '利好', changePercent: '+1.1%', summary: '美联储主席鲍威尔暗示可能在6月暂停加息周期。', weight: 68 },
    { source: 'Oilprice', title: '巴西深海油田发现新储量', date: '2026-03-15', sentiment: '利空', changePercent: '-0.6%', summary: '巴西国家石油公司在桑托斯盆地发现新的大型油田。', weight: 55 },
    { source: 'Bloomberg', title: '欧洲柴油裂解价差收窄', date: '2026-03-15', sentiment: '利空', changePercent: '-0.8%', summary: '欧洲柴油裂解价差降至18美元/桶，需求疲软信号。', weight: 50 },
    { source: 'Reuters', title: '挪威北海油田维护季开始', date: '2026-03-15', sentiment: '利好', changePercent: '+0.4%', summary: '挪威多个北海油田进入春季维护期，预计减产15万桶/日。', weight: 45 },
    { source: 'FT', title: '全球石油需求增长预期分歧加大', date: '2026-03-15', sentiment: '利空', changePercent: '-0.3%', summary: 'IEA与OPEC对2026年需求增长预测差距扩大至100万桶/日。', weight: 40 },
    { source: '汇通财经', title: '韩国炼油商加大俄罗斯原油采购', date: '2026-03-15', sentiment: '利空', changePercent: '-0.7%', summary: '韩国SK能源和GS Caltex增加折价俄罗斯ESPO原油进口。', weight: 58 },
    { source: 'Bloomberg', title: '美国二叠纪盆地管道运力充裕', date: '2026-03-15', sentiment: '利空', changePercent: '-0.5%', summary: '新管道投产使二叠纪盆地原油外运瓶颈完全消除。', weight: 48 },
    { source: 'Reuters', title: '安哥拉退出OPEC后增产提速', date: '2026-03-15', sentiment: '利空', changePercent: '-1.2%', summary: '安哥拉退出OPEC后不再受减产约束，计划将产量提升至120万桶/日。', weight: 65 },
    { source: 'CNBC', title: '全球电动车销量增长放缓', date: '2026-03-15', sentiment: '利好', changePercent: '+0.6%', summary: '全球电动车销量增速从45%降至28%，燃油车需求韧性超预期。', weight: 52 },
    { source: '新华社', title: '中东多国签署新能源合作协议', date: '2026-03-15', sentiment: '利空', changePercent: '-0.2%', summary: '海湾国家加速能源转型，沙特、阿联酋签署太阳能项目合作协议。', weight: 35 },
  ],
  '2026-03-14': [
    { source: 'Reuters', title: '沙特阿美下调亚洲官方售价', date: '2026-03-14', sentiment: '利空', changePercent: '-2.8%', summary: '沙特阿美将4月亚洲轻质原油官方售价下调1.5美元/桶。', weight: 90 },
    { source: 'Bloomberg', title: '美国钻机数量连续第四周下降', date: '2026-03-14', sentiment: '利好', changePercent: '+1.0%', summary: 'Baker Hughes数据显示美国石油钻机减少8座至580座。', weight: 72 },
    { source: 'Oilprice', title: '委内瑞拉制裁豁免到期', date: '2026-03-14', sentiment: '利好', changePercent: '+1.6%', summary: '美国对委内瑞拉石油出口的制裁豁免正式到期。', weight: 78 },
    { source: 'FT', title: '全球LNG市场供应过剩加剧', date: '2026-03-14', sentiment: '利空', changePercent: '-0.9%', summary: '卡塔尔和美国LNG新产能集中投产，现货价格承压。', weight: 62 },
    { source: 'CNBC', title: '美国成品油出口创历史新高', date: '2026-03-14', sentiment: '利空', changePercent: '-0.7%', summary: '美国成品油出口量达到680万桶/日，全球供应增加。', weight: 55 },
    { source: '新华社', title: '中国地方炼厂利润率转负', date: '2026-03-14', sentiment: '利空', changePercent: '-1.1%', summary: '山东地炼加工利润跌至-50元/吨，部分炼厂开始减产。', weight: 68 },
    { source: '汇通财经', title: '阿曼原油期货交割量激增', date: '2026-03-14', sentiment: '利好', changePercent: '+0.5%', summary: 'DME阿曼原油期货交割量创年内新高，亚洲需求强劲。', weight: 48 },
    { source: 'Bloomberg', title: '全球石油贸易商看空后市', date: '2026-03-14', sentiment: '利空', changePercent: '-1.4%', summary: 'Vitol、Trafigura等主要贸易商预计Q2油价将回落。', weight: 75 },
    { source: 'Reuters', title: '哥伦比亚管道遭武装袭击', date: '2026-03-14', sentiment: '利好', changePercent: '+1.8%', summary: '哥伦比亚Caño Limón-Coveñas管道遭ELN武装袭击停运。', weight: 80 },
    { source: 'Oilprice', title: '北极航线开通缩短亚欧运输', date: '2026-03-14', sentiment: '利空', changePercent: '-0.3%', summary: '北极航线提前开通，俄罗斯原油运往亚洲时间缩短40%。', weight: 42 },
  ],
  '2026-03-13': [
    { source: 'CNBC', title: '全球原油海上浮仓库存激增', date: '2026-03-13', sentiment: '利空', changePercent: '-1.9%', summary: '全球海上浮仓原油库存升至1.2亿桶，创6个月新高。', weight: 80 },
    { source: '新华社', title: '中国新能源汽车渗透率突破45%', date: '2026-03-13', sentiment: '利空', changePercent: '-1.5%', summary: '中国3月新能源汽车销量占比达45.3%，长期利空石油需求。', weight: 75 },
    { source: 'Reuters', title: '墨西哥湾飓风季预警提前发布', date: '2026-03-13', sentiment: '利好', changePercent: '+2.2%', summary: 'NOAA预测2026年大西洋飓风季将异常活跃。', weight: 70 },
    { source: 'FT', title: '英国北海税收政策引发投资撤离', date: '2026-03-13', sentiment: '利好', changePercent: '+0.7%', summary: '多家石油公司因暴利税政策缩减北海投资计划。', weight: 58 },
    { source: 'Bloomberg', title: '日本炼油商增加中东原油采购', date: '2026-03-13', sentiment: '利好', changePercent: '+0.5%', summary: '日本主要炼油商签订Q2中东原油长期采购合同。', weight: 48 },
    { source: 'Oilprice', title: '圭亚那Stabroek区块产量突破', date: '2026-03-13', sentiment: '利空', changePercent: '-1.3%', summary: 'ExxonMobil在圭亚那的产量突破65万桶/日，成为新兴产油大国。', weight: 72 },
    { source: '汇通财经', title: '中东现货市场溢价收窄', date: '2026-03-13', sentiment: '利空', changePercent: '-0.8%', summary: '迪拜/阿曼现货原油对期货溢价降至0.5美元/桶。', weight: 55 },
    { source: 'Bloomberg', title: '全球石油ETF资金大幅流出', date: '2026-03-13', sentiment: '利空', changePercent: '-1.0%', summary: '过去一周全球石油ETF净流出18亿美元。', weight: 62 },
    { source: 'Reuters', title: '苏丹内战影响石油出口', date: '2026-03-13', sentiment: '利好', changePercent: '+1.5%', summary: '苏丹内战导致Port Sudan原油出口设施受损。', weight: 68 },
    { source: 'CNBC', title: '美国SPR回购计划推迟', date: '2026-03-13', sentiment: '利空', changePercent: '-0.4%', summary: '美国能源部宣布推迟战略石油储备回购计划至下半年。', weight: 45 },
    { source: 'FT', title: '全球碳交易市场价格创新高', date: '2026-03-13', sentiment: '利空', changePercent: '-0.6%', summary: '欧盟碳排放配额价格突破95欧元/吨，增加化石能源成本。', weight: 52 },
  ],
  '2026-03-12': [
    { source: 'Bloomberg', title: '美国CPI数据超预期引发衰退担忧', date: '2026-03-12', sentiment: '利空', changePercent: '-3.1%', summary: '美国2月CPI同比上涨4.2%，核心CPI达3.8%，市场担忧滞胀风险。', weight: 92 },
    { source: 'Reuters', title: '哈萨克斯坦CPC管道检修完成', date: '2026-03-12', sentiment: '利空', changePercent: '-0.9%', summary: 'CPC管道恢复满负荷运行，日输送量回升至120万桶。', weight: 65 },
    { source: 'Oilprice', title: '阿联酋宣布扩大产能计划', date: '2026-03-12', sentiment: '利空', changePercent: '-1.4%', summary: 'ADNOC计划到2027年将产能提升至500万桶/日。', weight: 72 },
    { source: '新华社', title: '中俄签署新一轮原油供应协议', date: '2026-03-12', sentiment: '利空', changePercent: '-0.6%', summary: '中俄达成2026-2028年原油供应框架协议，年供应量增至8000万吨。', weight: 60 },
    { source: 'FT', title: '欧洲央行维持利率不变', date: '2026-03-12', sentiment: '利空', changePercent: '-0.5%', summary: '欧洲央行决定维持利率不变，欧元区经济增长前景黯淡。', weight: 55 },
    { source: 'CNBC', title: '美国原油产量再创历史新高', date: '2026-03-12', sentiment: '利空', changePercent: '-1.7%', summary: 'EIA数据显示美国原油产量达到1340万桶/日。', weight: 82 },
    { source: '汇通财经', title: '伊朗原油出口通过灰色渠道增加', date: '2026-03-12', sentiment: '利空', changePercent: '-0.8%', summary: '卫星追踪数据显示伊朗原油出口量升至180万桶/日。', weight: 68 },
    { source: 'Bloomberg', title: '全球经济衰退概率升至35%', date: '2026-03-12', sentiment: '利空', changePercent: '-2.3%', summary: 'Bloomberg经济模型显示全球经济衰退概率显著上升。', weight: 85 },
    { source: 'Oilprice', title: '尼日利亚Dangote炼厂满负荷运行', date: '2026-03-12', sentiment: '利空', changePercent: '-1.0%', summary: 'Dangote炼厂达到65万桶/日满负荷运行，减少非洲成品油进口。', weight: 70 },
    { source: 'Reuters', title: '国际海事组织收紧船舶排放标准', date: '2026-03-12', sentiment: '利空', changePercent: '-0.3%', summary: 'IMO新规要求2027年起船舶燃料硫含量进一步降低。', weight: 42 },
    { source: '新华社', title: '中国光伏装机量突破1TW', date: '2026-03-12', sentiment: '利空', changePercent: '-0.4%', summary: '中国累计光伏装机量突破1太瓦，加速能源结构转型。', weight: 48 },
  ],
};

// Large pool of diverse news templates for procedural generation
const newsTemplatePool = [
  // 地缘政治类 (Geopolitical)
  { title: '中东局势变化影响原油运输', summary: '地缘政治紧张局势导致原油运输路线调整，运费成本上升。', pctRange: [1.5, 4.0] as [number, number], sources: ['Reuters', 'Bloomberg', 'FT'] },
  { title: '非洲产油国政局动荡', summary: '非洲主要产油国内部冲突影响产量，供应中断风险上升。', pctRange: [1.0, 3.5] as [number, number], sources: ['Reuters', 'FT', 'Oilprice'] },
  { title: '俄罗斯能源出口政策调整', summary: '俄罗斯调整原油出口关税和配额政策，影响全球供应格局。', pctRange: [0.8, 2.5] as [number, number], sources: ['Bloomberg', 'Reuters', '汇通财经'] },
  { title: '南海航运安全事件', summary: '南海地区发生航运安全事件，影响亚洲原油运输通道。', pctRange: [1.2, 3.0] as [number, number], sources: ['新华社', 'Reuters', 'CNBC'] },
  { title: '红海航运风险持续升级', summary: '胡塞武装持续威胁红海航运安全，多家船公司绕行好望角。', pctRange: [1.8, 3.5] as [number, number], sources: ['FT', 'Bloomberg', '汇通财经'] },
  { title: '伊朗核设施遭受网络攻击', summary: '伊朗核设施疑似遭受网络攻击，中东紧张局势加剧。', pctRange: [2.0, 4.5] as [number, number], sources: ['Reuters', 'CNBC', 'Bloomberg'] },
  { title: '委内瑞拉与圭亚那边境争端', summary: '委内瑞拉与圭亚那就Essequibo地区主权争端升级。', pctRange: [0.8, 2.0] as [number, number], sources: ['Reuters', 'FT', 'Oilprice'] },
  { title: '土耳其与伊拉克管道谈判进展', summary: '土耳其与伊拉克就恢复北部原油出口管道进行新一轮谈判。', pctRange: [0.5, 1.8] as [number, number], sources: ['Reuters', 'Bloomberg', '汇通财经'] },
  // 供需类 (Supply & Demand)
  { title: '美国原油库存数据公布', summary: 'EIA公布最新原油库存周报数据，市场关注库存变化趋势。', pctRange: [0.5, 2.5] as [number, number], sources: ['CNBC', 'Bloomberg', 'Oilprice'] },
  { title: 'OPEC月报调整需求预期', summary: 'OPEC发布月度石油市场报告，调整全球需求增长预测。', pctRange: [0.8, 2.0] as [number, number], sources: ['Reuters', 'Oilprice', '汇通财经'] },
  { title: '全球炼油厂开工率变化', summary: '主要经济体炼油厂开工率出现显著变化，影响成品油供应。', pctRange: [0.3, 1.5] as [number, number], sources: ['Bloomberg', 'CNBC', '新华社'] },
  { title: '美国页岩油产量数据更新', summary: 'EIA发布最新页岩油产量预测，二叠纪盆地产量变化引关注。', pctRange: [0.6, 1.8] as [number, number], sources: ['Oilprice', 'CNBC', 'Bloomberg'] },
  { title: '全球石油需求季节性波动', summary: '季节性因素导致全球石油需求出现变化，炼油利润率波动。', pctRange: [0.4, 1.2] as [number, number], sources: ['Bloomberg', 'FT', 'Reuters'] },
  { title: '亚洲原油进口量创新纪录', summary: '亚洲主要经济体原油进口量持续增长，需求韧性超预期。', pctRange: [0.6, 1.8] as [number, number], sources: ['新华社', 'Bloomberg', 'Reuters'] },
  { title: '全球成品油裂解价差波动', summary: '全球主要地区成品油裂解价差出现显著变化。', pctRange: [0.4, 1.5] as [number, number], sources: ['FT', 'Bloomberg', 'Oilprice'] },
  { title: '美国墨西哥湾炼厂检修季', summary: '美国墨西哥湾沿岸炼厂进入春季检修期，原油加工量下降。', pctRange: [0.3, 1.2] as [number, number], sources: ['CNBC', 'Oilprice', 'Bloomberg'] },
  { title: '全球石油贸易流向变化', summary: '制裁和地缘因素导致全球石油贸易流向发生结构性变化。', pctRange: [0.5, 1.6] as [number, number], sources: ['FT', 'Reuters', 'Bloomberg'] },
  { title: '印度成为全球第三大原油消费国', summary: '印度石油需求持续增长，超越日本成为第三大消费国。', pctRange: [0.4, 1.3] as [number, number], sources: ['新华社', 'Bloomberg', 'Reuters'] },
  // 政策/宏观类 (Policy & Macro)
  { title: '美联储利率决议影响油市', summary: '美联储最新利率决议对大宗商品市场产生影响。', pctRange: [0.5, 2.0] as [number, number], sources: ['CNBC', 'Bloomberg', 'FT'] },
  { title: '碳排放政策收紧预期', summary: '主要经济体加速推进碳排放限制政策，化石能源面临压力。', pctRange: [0.3, 1.5] as [number, number], sources: ['FT', '新华社', 'Reuters'] },
  { title: '能源补贴政策调整', summary: '多国调整化石能源补贴政策，影响终端需求。', pctRange: [0.4, 1.8] as [number, number], sources: ['Bloomberg', 'Reuters', '新华社'] },
  { title: '国际能源署发布特别报告', summary: 'IEA发布关于全球能源转型的特别报告。', pctRange: [0.5, 1.6] as [number, number], sources: ['Reuters', 'FT', 'Bloomberg'] },
  { title: '美元汇率波动影响油价', summary: '美元指数变动对以美元计价的原油产生直接影响。', pctRange: [0.6, 2.2] as [number, number], sources: ['CNBC', 'Bloomberg', '汇通财经'] },
  { title: '全球央行货币政策分化', summary: '主要央行货币政策走向分化，影响大宗商品定价。', pctRange: [0.4, 1.5] as [number, number], sources: ['FT', 'Bloomberg', 'CNBC'] },
  { title: '新兴市场经济数据发布', summary: '新兴市场经济数据影响全球石油需求预期。', pctRange: [0.3, 1.2] as [number, number], sources: ['Bloomberg', 'Reuters', '新华社'] },
  { title: '全球贸易摩擦升级', summary: '主要经济体间贸易摩擦加剧，影响全球经济增长预期。', pctRange: [0.8, 2.5] as [number, number], sources: ['FT', 'CNBC', 'Reuters'] },
  // 技术/市场类 (Technical & Market)
  { title: '原油期货持仓数据变化', summary: 'CFTC持仓报告显示投机头寸出现显著变化。', pctRange: [0.3, 1.0] as [number, number], sources: ['Bloomberg', 'CNBC', 'Oilprice'] },
  { title: '石油ETF资金流向变化', summary: '全球石油相关ETF资金流向出现明显转变。', pctRange: [0.4, 1.2] as [number, number], sources: ['CNBC', 'Bloomberg', 'FT'] },
  { title: '原油期货曲线结构变化', summary: '原油期货曲线结构变化反映市场对供需前景的预期调整。', pctRange: [0.3, 0.9] as [number, number], sources: ['Bloomberg', 'Oilprice', '汇通财经'] },
  { title: '全球石油钻机数量变化', summary: 'Baker Hughes数据显示全球石油钻机数量出现变化。', pctRange: [0.4, 1.3] as [number, number], sources: ['Oilprice', 'CNBC', 'Bloomberg'] },
  { title: '大型石油公司季度业绩发布', summary: '国际石油巨头发布最新季度财报，影响市场情绪。', pctRange: [0.5, 1.5] as [number, number], sources: ['FT', 'Bloomberg', 'Reuters'] },
  { title: '新能源投资挤压石油资本支出', summary: '全球能源投资加速向新能源转移，石油上游投资面临压力。', pctRange: [0.3, 1.0] as [number, number], sources: ['FT', 'Bloomberg', '新华社'] },
];

// Generate news for dates not in the database using a deterministic algorithm
function generateNewsForDate(date: string): Omit<NewsItem, 'id'>[] {
  const dateParts = date.split('-');
  const seed = (parseInt(dateParts[0]) * 10000 + parseInt(dateParts[1]) * 100 + parseInt(dateParts[2])) * 137;
  const rand = seededRandom(seed);

  // Always generate 10-12 items
  const count = 10 + Math.floor(rand() * 3);
  const news: Omit<NewsItem, 'id'>[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count + 5; i++) { // Generate extra to account for dedup
    // Pick a template not yet used
    let idx = Math.floor(rand() * newsTemplatePool.length);
    let attempts = 0;
    while (usedIndices.has(idx) && attempts < 20) {
      idx = (idx + 1) % newsTemplatePool.length;
      attempts++;
    }
    if (usedIndices.has(idx)) continue;
    usedIndices.add(idx);

    const tpl = newsTemplatePool[idx];
    const source = tpl.sources[Math.floor(rand() * tpl.sources.length)];
    const isPositive = rand() > 0.45;
    const pct = tpl.pctRange[0] + rand() * (tpl.pctRange[1] - tpl.pctRange[0]);
    const changePercent = `${isPositive ? '+' : '-'}${pct.toFixed(1)}%`;

    news.push({
      source,
      title: tpl.title,
      date,
      sentiment: isPositive ? '利好' : '利空',
      changePercent,
      summary: tpl.summary,
      weight: Math.round(40 + rand() * 55),
    });

    if (news.length >= count) break;
  }

  return news;
}

export function getNewsForDate(date: string): NewsItem[] {
  // First check exact date match in curated database
  if (dateNewsDatabase[date]) {
    return dateNewsDatabase[date].map((n, i) => ({ ...n, id: i + 1 }));
  }

  // For all other dates, generate deterministic news
  const generated = generateNewsForDate(date);
  return generated.map((n, i) => ({ ...n, id: i + 1 }));
}

// ==================== Similar Events Mock Data ====================

export const SIMILAR_EVENTS: SimilarEvent[] = [
  {
    id: 1, title: '美以伊冲突升级', similarity: 90,
    periodStart: '2024/03/12', periodEnd: '2024/04/12',
    chartData: [
      { week: 'W1', actual: 800, predicted: 600 },
      { week: 'W2', actual: 5500, predicted: 8000 },
      { week: 'W3', actual: 3000, predicted: 6500 },
      { week: 'W4', actual: 1500, predicted: 2000 },
    ],
  },
  {
    id: 2, title: '法国道达尔能源', similarity: 70,
    periodStart: '2024/03/12', periodEnd: '2024/04/12',
    chartData: [
      { week: 'W1', actual: 500, predicted: 400 },
      { week: 'W2', actual: 4000, predicted: 7000 },
      { week: 'W3', actual: 5000, predicted: 5500 },
      { week: 'W4', actual: 2000, predicted: 1500 },
    ],
  },
  {
    id: 3, title: '霍尔木兹海峡航运受阻', similarity: 50,
    periodStart: '2024/03/12', periodEnd: '2024/04/12',
    chartData: [
      { week: 'W1', actual: 300, predicted: 500 },
      { week: 'W2', actual: 6000, predicted: 9000 },
      { week: 'W3', actual: 4000, predicted: 3500 },
      { week: 'W4', actual: 1000, predicted: 800 },
    ],
  },
  {
    id: 4, title: '俄乌冲突能源制裁', similarity: 45,
    periodStart: '2022/02/24', periodEnd: '2022/03/24',
    chartData: [
      { week: 'W1', actual: 1200, predicted: 1000 },
      { week: 'W2', actual: 7000, predicted: 8500 },
      { week: 'W3', actual: 5500, predicted: 4000 },
      { week: 'W4', actual: 3000, predicted: 2500 },
    ],
  },
  {
    id: 5, title: 'OPEC+突然减产', similarity: 40,
    periodStart: '2023/04/02', periodEnd: '2023/05/02',
    chartData: [
      { week: 'W1', actual: 600, predicted: 800 },
      { week: 'W2', actual: 3500, predicted: 5000 },
      { week: 'W3', actual: 4500, predicted: 4000 },
      { week: 'W4', actual: 2000, predicted: 1800 },
    ],
  },
];

// ==================== Preset Questions ====================

export const PRESET_QUESTIONS = [
  '模拟生成10条2026.4.1-2026.4.10期间影响油价的新闻事件',
  '模拟生成5条2026.3.25-2026.3.30期间影响油价的重大地缘政治新闻',
  '模拟生成8条2026.4.5-2026.4.20期间OPEC+政策变动对油价的影响事件',
];