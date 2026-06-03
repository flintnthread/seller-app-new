import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
  fetchAnalyticsOverview,
  fetchPaymentMethods,
  fetchSalesTrend,
  fetchTopSellingProducts,
} from '@/services/earningsApi';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform,
  useWindowDimensions
} from 'react-native';
import { AppHeader } from "@/components/common/AppHeader";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Marker,
  Path,
  Polygon,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendPoint = { label: string; value: number };

interface Channel {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface PaymentMethod {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface Product {
  name: string;
  qty: number;
  value: number;
  pct: number;
  uri: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: '#F5F7FB',
  white: '#FFFFFF',
  navyDeep: '#001B5E',
  navyMid: '#002D8F',
  navy: '#0B3D91',
  textDark: '#111827',
  textMid: '#4B5563',
  textLight: '#6B7280',
  border: '#E8ECF4',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F97316',
};

const RANGE_OPTIONS: string[] = ['This Day', 'Last 7 days', 'Last 30 Days', 'This Month', 'Custom Date Range'];

const CHANNEL_OPTIONS: string[] = [
  'All Channels', 'UPI', 'Card', 'COD', 'Net Banking',
];

const { width: SW } = Dimensions.get('window');
const CELL_SIZE = Platform.OS === 'web' ? 42 : Math.floor((SW - 48) / 7);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInr0(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDateShort(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateDisplay(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function rangeToTrendPeriod(range: string): string {
  if (range === 'This Day') return 'day';
  if (range === 'Last 7 days') return 'week';
  if (range === 'This Month' || range === 'Last 30 Days') return 'month';
  return 'week';
}

function totalsalesPeriodFromRange(range: string): string {
  return rangeToTrendPeriod(range);
}

const PAYMENT_COLORS: Record<string, string> = {
  UPI: '#0B3D91',
  Card: '#10B981',
  COD: '#8B5CF6',
  'Net Banking': '#F59E0B',
  Other: '#6B7280',
};

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function trendChartMax(values: number[]): number {
  const max = Math.max(1, ...values);
  if (max >= 100000) return Math.ceil(max / 20000) * 20000;
  if (max >= 30000) return Math.ceil(max / 5000) * 5000;
  return Math.ceil(max / 1000) * 1000;
}

function trendYLabels(chartMax: number): string[] {
  if (chartMax >= 100000) {
    const step = chartMax / 3;
    return [`₹${Math.round(step * 3 / 1000)}K`, `₹${Math.round(step * 2 / 1000)}K`, `₹${Math.round(step / 1000)}K`, '₹0'];
  }
  if (chartMax >= 30000) {
    const step = chartMax / 3;
    return [`₹${Math.round(step * 3 / 1000)}K`, `₹${Math.round(step * 2 / 1000)}K`, `₹${Math.round(step / 1000)}K`, '₹0'];
  }
  const step = chartMax / 3;
  return [`₹${Math.round(step * 3 / 1000)}K`, `₹${Math.round(step * 2 / 1000)}K`, `₹${Math.round(step / 1000)}K`, '₹0'];
}

// ─── Smooth Path ──────────────────────────────────────────────────────────────

function buildSmoothPath(xs: number[], ys: number[]): string {
  return xs.map((x, i) => {
    const y = ys[i] ?? 0;
    if (i === 0) return `M ${x} ${y}`;
    const prevX = xs[i - 1] ?? 0;
    const prevY = ys[i - 1] ?? 0;
    return `Q ${(prevX + x) / 2} ${prevY}, ${x} ${y}`;
  }).join(' ');
}

// ─── Calendar Picker ──────────────────────────────────────────────────────────

interface CalendarPickerProps {
  visible: boolean; startDate: Date; endDate: Date;
  onConfirm: (start: Date, end: Date) => void;
  onClose: () => void; mode?: 'range' | 'single';
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CalendarPicker: React.FC<CalendarPickerProps> = ({ visible, startDate, endDate, onConfirm, onClose, mode = 'range' }) => {
  const [viewYear, setViewYear] = useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getMonth());
  const [selStart, setSelStart] = useState<Date>(startDate);
  const [selEnd, setSelEnd] = useState<Date>(endDate);
  const [picking, setPicking] = useState<'start' | 'end'>('start');

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const isInRange = (d: Date) => mode !== 'single' && d > selStart && d < selEnd;

  const handleDayPress = (day: number) => {
    const pressed = new Date(viewYear, viewMonth, day);
    if (mode === 'single') {
      setSelStart(pressed);
      setSelEnd(pressed);
      return;
    }
    if (picking === 'start') {
      setSelStart(pressed);
      setSelEnd(pressed);
      setPicking('end');
    } else {
      if (pressed < selStart) {
        setSelStart(pressed);
        setPicking('end');
      } else {
        setSelEnd(pressed);
        setPicking('start');
      }
    }
  };

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const gridRef = useRef<View | null>(null);
  const [gridPos, setGridPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const measureGrid = () => {
    gridRef.current?.measureInWindow((x, y, w, h) => setGridPos({ x, y, w, h }));
  };

  const handleTouchAt = (pageX: number, pageY: number) => {
    if (Platform.OS === 'web') return; // Click handlers are used on Web
    const relX = pageX - gridPos.x;
    const relY = pageY - gridPos.y;
    if (relX < 0 || relY < 0) return;
    const col = Math.floor(relX / CELL_SIZE);
    const row = Math.floor(relY / CELL_SIZE);
    const idx = row * 7 + col;
    const day = cells[idx];
    if (!day) return;
    const touchedDate = new Date(viewYear, viewMonth, day);
    if (mode === 'single') { setSelStart(touchedDate); setSelEnd(touchedDate); return; }
    if (picking === 'start') { setSelStart(touchedDate); setSelEnd(touchedDate); setPicking('end'); }
    else { setSelEnd(touchedDate); }
  };

  const onResponderGrant = (evt: any) => { measureGrid(); handleTouchAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY); };
  const onResponderMove = (evt: any) => { handleTouchAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY); };
  const onResponderRelease = () => { setPicking('start'); };

  const hasRange = mode === 'range' && selStart && selEnd && !isSameDay(selStart, selEnd);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={cal.modalContainer}>
          <TouchableWithoutFeedback onPress={() => { /* prevent close when clicking dialog content */ }}>
            <View style={cal.sheet}>
              <View style={cal.sheetHeader}>
                <Text style={cal.sheetTitle}>Select Date{mode === 'range' ? ' Range' : ''}</Text>
                <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.textDark} /></TouchableOpacity>
              </View>
              {mode === 'range' && (
                <View style={cal.rangeDisplay}>
                  <TouchableOpacity style={[cal.rangeBox, picking === 'start' && cal.rangeBoxActive]} onPress={() => setPicking('start')}>
                    <Text style={cal.rangeLabel}>From</Text>
                    <Text style={[cal.rangeValue, picking === 'start' && cal.rangeValueActive]}>{formatDateDisplay(selStart)}</Text>
                  </TouchableOpacity>
                  <View style={cal.rangeDivider}><Ionicons name="arrow-forward" size={16} color={C.textLight} /></View>
                  <TouchableOpacity style={[cal.rangeBox, picking === 'end' && cal.rangeBoxActive]} onPress={() => setPicking('end')}>
                    <Text style={cal.rangeLabel}>To</Text>
                    <Text style={[cal.rangeValue, picking === 'end' && cal.rangeValueActive]}>{formatDateDisplay(selEnd)}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={cal.monthNav}>
                <TouchableOpacity style={cal.navBtn} onPress={prevMonth}><Ionicons name="chevron-back" size={20} color={C.navy} /></TouchableOpacity>
                <Text style={cal.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                <TouchableOpacity style={cal.navBtn} onPress={nextMonth}><Ionicons name="chevron-forward" size={20} color={C.navy} /></TouchableOpacity>
              </View>
              <View style={cal.dayNamesRow}>{DAY_NAMES.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}</View>
              <View ref={gridRef} onLayout={measureGrid} style={cal.grid}
                onStartShouldSetResponder={Platform.OS === 'web' ? undefined : () => true}
                onMoveShouldSetResponder={Platform.OS === 'web' ? undefined : () => true}
                onResponderGrant={Platform.OS === 'web' ? undefined : onResponderGrant}
                onResponderMove={Platform.OS === 'web' ? undefined : onResponderMove}
                onResponderRelease={Platform.OS === 'web' ? undefined : onResponderRelease}
              >
                {cells.map((day, idx) => {
                  if (!day) return <View key={`e-${idx}`} style={cal.cell} />;
                  const thisDate = new Date(viewYear, viewMonth, day);
                  const isStart = isSameDay(thisDate, selStart);
                  const isEnd = mode === 'range' && isSameDay(thisDate, selEnd);
                  const inRange = isInRange(thisDate);
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.7}
                      style={[
                        cal.cell,
                        inRange && cal.cellInRange,
                      ]}
                      onPress={() => handleDayPress(day)}>
                      {hasRange && isStart && <View style={cal.rangeConnectRight} />}
                      {hasRange && isEnd && <View style={cal.rangeConnectLeft} />}
                      <View style={[
                        cal.cellContent,
                        (isStart || isEnd) && cal.cellSelected,
                      ]}>
                        <Text style={[
                          cal.cellText,
                          inRange && cal.cellTextInRange,
                          (isStart || isEnd) && cal.cellTextSelected
                        ]}>
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={cal.confirmBtn} onPress={() => { onConfirm(selStart, selEnd); onClose(); }} activeOpacity={0.85}>
                <Text style={cal.confirmText}>{mode === 'range' ? 'Apply Date Range' : 'Apply Date'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Sales Trend Chart ────────────────────────────────────────────────────────

const SalesTrendChart: React.FC<{ range: string; customFrom?: Date | undefined; customTo?: Date | undefined }> = ({
  range,
  customFrom,
  customTo,
}) => {
  const [chartWidth, setChartWidth] = useState(SW - 32 - 46 - 12);
  const W = chartWidth;
  const H = 170;
  const P = 10;

  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (range === 'Custom Date Range' && customFrom && customTo) {
      setLoading(true);
      fetchSalesTrend('week', formatIsoDate(customFrom), formatIsoDate(customTo))
        .then((pts) => setTrendData(pts.map((p) => ({ label: p.label, value: p.value }))))
        .catch(() => setTrendData([]))
        .finally(() => setLoading(false));
      return;
    }
    if (range === 'Custom Date Range') {
      setTrendData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSalesTrend(rangeToTrendPeriod(range))
      .then((pts) => setTrendData(pts.map((p) => ({ label: p.label, value: p.value }))))
      .catch(() => setTrendData([]))
      .finally(() => setLoading(false));
  }, [range, customFrom, customTo]);

  if (loading) {
    return (
      <View style={[s.trendRow, { minHeight: H, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: C.textLight }}>Loading chart…</Text>
      </View>
    );
  }

  if (trendData.length === 0) {
    return (
      <View style={[s.trendRow, { minHeight: H, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: C.textLight }}>No sales data for this period</Text>
      </View>
    );
  }

  const chartMax = trendChartMax(trendData.map((p) => p.value));
  const activeIndex = Math.max(0, trendData.length - 1);
  const denom = Math.max(1, trendData.length - 1);

  const xs = trendData.map((_, i) => (i / denom) * (W - P * 2) + P);
  const ys = trendData.map(({ value }) => H - (Math.max(0, Math.min(chartMax, value)) / chartMax) * (H - P * 2) - P);

  const path = buildSmoothPath(xs, ys);
  const areaPath = `${path} L ${xs[xs.length - 1] ?? W} ${H - P} L ${xs[0] ?? 0} ${H - P} Z`;
  const ax = xs[activeIndex] ?? 0;
  const ay = ys[activeIndex] ?? 0;
  const activePoint = trendData[activeIndex];
  const lastIndex = xs.length - 1;

  const yLabels = trendYLabels(chartMax);

  return (
    <View style={s.trendRow}>
      <View style={s.yAxis}>
        {yLabels.map(t => <Text key={t} style={s.yAxisLabel}>{t}</Text>)}
      </View>
      <View style={s.flex1} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        <View style={s.trendChartWrap}>
          <Svg width={W} height={H}>
            <Defs>
              <ClipPath id="chartClip">
                <Rect x={0} y={0} width={W} height={H} />
              </ClipPath>
              <SvgLinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={C.navy} stopOpacity={0.18} />
                <Stop offset="100%" stopColor={C.navy} stopOpacity={0} />
              </SvgLinearGradient>
            </Defs>
            <G clipPath="url(#chartClip)">
              {[1, 2].map(i => (
                <Path key={i} d={`M 0 ${(H - P * 2) * (i / 3) + P} L ${W} ${(H - P * 2) * (i / 3) + P}`}
                  stroke="#E9EEF7" strokeWidth={1} strokeDasharray="4 4" />
              ))}
              <Path d={areaPath} fill="url(#areaFill)" />
              <Path d={path} stroke={C.navy} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {xs.map((x, i) => {
                if (i === lastIndex || i === activeIndex) return null;
                return <Circle key={i} cx={x} cy={ys[i]} r={5} fill={C.white} stroke={C.navy} strokeWidth={2} />;
              })}
              {activeIndex !== lastIndex && (
                <>
                  <Circle cx={ax} cy={ay} r={5} fill={C.navy} />
                  <Circle cx={ax} cy={ay} r={2.5} fill={C.white} />
                </>
              )}
            </G>
          </Svg>
          {activePoint && activeIndex !== lastIndex && (
            <View style={[s.tooltip, { left: ax - 40, top: Math.max(8, ay - 54) }]}>
              <Text style={s.tooltipDate}>{activePoint.label}</Text>
              <Text style={s.tooltipAmount}>₹{formatInr0(activePoint.value)}</Text>
            </View>
          )}
        </View>
        <View style={s.xAxis}>
          {trendData.map(p => <Text key={p.label} style={s.xAxisLabel}>{p.label}</Text>)}
        </View>
      </View>
    </View>
  );
};

// ─── Payment Method Donut ─────────────────────────────────────────────────────
// Clicking a colored segment shows/hides its arrow label.

const PaymentDonut: React.FC<{ methods: PaymentMethod[]; total: number }> = ({ methods, total }) => {
  // -1 means no segment selected; index means that segment is active
  const [activeSegment, setActiveSegment] = useState<number>(-1);

  // Donut geometry — larger size
  const size = 220;
  const strokeWidth = 26;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Pre-compute cumulative percentages for each segment
  let cumulativePct = 0;
  const segments = methods.map((seg, idx) => {
    const startPct = cumulativePct;
    cumulativePct += seg.pct;
    const midPct = startPct + seg.pct / 2;
    return { ...seg, idx, startPct, midPct };
  });

  // Given a percentage along the circle (0–100), return x/y at a given radius
  // Angle 0% = top (−90deg rotated), goes clockwise
  const getPoint = (pct: number, rad: number) => {
    const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + rad * Math.cos(angle),
      y: cy + rad * Math.sin(angle),
    };
  };

  // Arrow label positions: from arc outer edge → outward label
  const outerR = r + strokeWidth / 2;      // outer edge of stroke
  const labelR = outerR + 38;              // where the label tip sits
  const labelTextR = outerR + 52;          // where text starts

  // viewBox is enlarged to fit labels outside the donut
  const padding = 90;
  const vbSize = size + padding * 2;
  const vbOff = -padding;

  const handleSegmentPress = (idx: number) => {
    setActiveSegment(prev => (prev === idx ? -1 : idx));
  };

  return (
    <View style={[s.donutBox]}>
      <Svg
        width={size + padding * 2}
        height={size + padding * 2}
        viewBox={`${vbOff} ${vbOff} ${vbSize} ${vbSize}`}
      >
        <Defs>
          {/* Arrow marker — one per color so it matches the segment */}
          {segments.map(seg => (
            <Marker
              key={`marker-${seg.label}`}
              id={`arrow-${seg.label}`}
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <Polygon
                points="0,0 6,3 0,6"
                fill={seg.color}
              />
            </Marker>
          ))}
        </Defs>

        {/* Background ring */}
        <Circle
          cx={cx} cy={cy} r={r}
          stroke="#EEF2FF"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Colored arc segments — tappable */}
        {segments.map((seg) => {
          const dash = (seg.pct / 100) * circumference;
          const dashOffset = -(seg.startPct / 100) * circumference;
          const isActive = activeSegment === seg.idx;
          return (
            <Circle
              key={seg.label}
              cx={cx} cy={cy} r={r}
              stroke={seg.color}
              strokeWidth={isActive ? strokeWidth + 6 : strokeWidth}
              fill="none"
              strokeDasharray={`${Math.max(0, dash - 2)} ${circumference - dash + 2}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              onPress={() => handleSegmentPress(seg.idx)}
            />
          );
        })}

        {/* Arrow + label — only for the active segment */}
        {segments.map((seg) => {
          if (activeSegment !== seg.idx) return null;

          const arcEdge = getPoint(seg.midPct, outerR);
          const labelTip = getPoint(seg.midPct, labelR);
          const labelTxt = getPoint(seg.midPct, labelTextR);

          // Determine text anchor based on which side of the circle
          const angle = (seg.midPct / 100) * 360 - 90;
          const isRight = angle > -90 && angle < 90;
          const textAnchor = labelTxt.x > cx ? 'start' : 'end';
          const textOffsetX = labelTxt.x > cx ? 4 : -4;

          return (
            <G key={`arrow-label-${seg.label}`}>
              <Line
                x1={arcEdge.x}
                y1={arcEdge.y}
                x2={labelTip.x}
                y2={labelTip.y}
                stroke={seg.color}
                strokeWidth={1.8}
                markerEnd={`url(#arrow-${seg.label})`}
              />
              <SvgText
  x={labelTxt.x + textOffsetX}
  y={labelTxt.y + 4}
  fontSize={13}
  fontWeight="800"
  fill={seg.color}
  textAnchor={textAnchor}
>
  {seg.label}
</SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Center text — absolutely positioned over the SVG */}
      <View pointerEvents="none" style={s.donutCenter}>
        <Text style={s.donutCenterLabel}>Total Sales</Text>
        <Text style={s.donutCenterValue}>₹{formatInr(total)}</Text>
      </View>
    </View>
  );
};

// ─── Range Dropdown ───────────────────────────────────────────────────────────

interface RangeDropdownProps {
  selected: string;
  onSelect: (opt: string) => void;
  onCustomRange?: () => void;
}

const RangeDropdown: React.FC<RangeDropdownProps> = ({ selected, onSelect, onCustomRange }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<View>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const measureBtn = () => btnRef.current?.measureInWindow((x, y, w, h) => { setPos({ x, y, w, h }); setOpen(true); });

  const handleSelect = (opt: string) => {
    onSelect(opt);
    setOpen(false);
    if (opt === 'Custom Date Range' && onCustomRange) {
      onCustomRange();
    }
  };

  return (
    <>
      <TouchableOpacity ref={btnRef} activeOpacity={0.7} style={s.dropdownBtn} onPress={measureBtn}>
        <Text style={s.dropdownText}>{selected}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textDark} />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}><View style={StyleSheet.absoluteFillObject} /></TouchableWithoutFeedback>
        <View style={[s.dropdownMenu, { top: pos.y + pos.h + 6, left: pos.x, minWidth: Math.max(pos.w, 160) }]}>
          {RANGE_OPTIONS.map((opt, i) => {
            const isSelected = opt === selected;
            return (
              <TouchableOpacity key={opt} activeOpacity={0.85}
                style={[s.dropdownItem, isSelected && s.dropdownItemActive, i < RANGE_OPTIONS.length - 1 && s.dropdownItemBorder]}
                onPress={() => handleSelect(opt)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {opt === 'Custom Date Range' && (
                    <Ionicons name="calendar-outline" size={14} color={isSelected ? C.white : C.textLight} />
                  )}
                  <Text style={[s.dropdownItemText, isSelected && s.dropdownItemTextActive]}>{opt}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={16} color={C.white} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </>
  );
};

// ─── Channel Dropdown ─────────────────────────────────────────────────────────

const CHANNEL_DOT_COLORS: Record<string, string> = {
  'UPI': '#0B3D91', 'Card': '#10B981', 'COD': '#8B5CF6', 'Net Banking': '#F59E0B',
};

const ChannelDropdown: React.FC<{ selected: string; onSelect: (opt: string) => void; style?: any }> = ({ selected, onSelect, style }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<View>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const measureBtn = () => btnRef.current?.measureInWindow((x, y, w, h) => { setPos({ x, y, w, h }); setOpen(true); });

  return (
    <>
      <TouchableOpacity ref={btnRef} activeOpacity={0.7} style={[s.filterItem, style]} onPress={measureBtn}>
        <View style={s.filterRight}><Text style={s.filterText}>{selected}</Text></View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textLight} />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}><View style={StyleSheet.absoluteFillObject} /></TouchableWithoutFeedback>
        <View style={[s.dropdownMenu, { top: pos.y + pos.h + 6, left: pos.x, minWidth: Math.max(pos.w, 180) }]}>
          {CHANNEL_OPTIONS.map((opt, i) => {
            const isSelected = opt === selected;
            const dotColor = CHANNEL_DOT_COLORS[opt];
            return (
              <TouchableOpacity key={opt} activeOpacity={0.85}
                style={[s.dropdownItem, isSelected && s.dropdownItemActive, i < CHANNEL_OPTIONS.length - 1 && s.dropdownItemBorder]}
                onPress={() => { onSelect(opt); setOpen(false); }}>
                <View style={s.channelOptRow}>
                  {dotColor
                    ? <View style={[s.channelOptDot, { backgroundColor: dotColor }]} />
                    : <Ionicons name="layers-outline" size={14} color={isSelected ? C.white : C.textLight} />
                  }
                  <Text style={[s.dropdownItemText, isSelected && s.dropdownItemTextActive]}>{opt}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={16} color={C.white} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TotalSalesScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWebLayout = isWeb && windowWidth >= 800;

  // KPI card width on Web
  const kpiWidth = isWeb
    ? (windowWidth >= 1024 ? '31.8%' : windowWidth >= 640 ? '48%' : '100%')
    : undefined;

  const [selectedRange, setSelectedRange] = useState('Last 7 days');
  const [selectedChannel, setSelectedChannel] = useState('All Channels');
  const [filterStart, setFilterStart] = useState(new Date(2026, 4, 20));
  const [filterEnd, setFilterEnd] = useState(new Date(2026, 4, 26));
  const [showFilterCal, setShowFilterCal] = useState(false);
  const [showHeaderCal, setShowHeaderCal] = useState(false);
  // ── NEW: calendar opened from "Custom Date Range" in Sales Trend dropdown ──
  const [showTrendCal, setShowTrendCal] = useState(false);

  const [apiOverview, setApiOverview] = useState<{
    total: number; orders: number; aov: number; returns: number;
    cancels: number; replacements: number;
    channels: Channel[];
  } | null>(null);
  const [apiPaymentMethods, setApiPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [apiProducts, setApiProducts] = useState<{ name: string; qty: number; value: number; pct: number; uri: string }[] | null>(null);

  useEffect(() => {
    const period = totalsalesPeriodFromRange(selectedRange);
    fetchAnalyticsOverview(period, selectedChannel)
      .then((s) => {
        const total = Number(s.total ?? 0);
        const orders = s.orders ?? 0;
        const channelTotal = s.channels.reduce((sum, c) => sum + Number(c.amount ?? 0), 0) || total;
        setApiOverview({
          total,
          orders,
          aov: s.aov ?? (orders > 0 ? Math.round(total / orders) : 0),
          returns: s.returns ?? 0,
          cancels: s.cancels ?? 0,
          replacements: s.replacements ?? 0,
          channels: s.channels.map((c) => ({
            label: c.name,
            value: Number(c.amount ?? 0),
            pct: channelTotal > 0 ? (Number(c.amount ?? 0) / channelTotal) * 100 : 0,
            color: PAYMENT_COLORS[c.name] ?? '#0B3D91',
          })),
        });
      })
      .catch(() => setApiOverview(null));
    fetchPaymentMethods(period)
      .then((methods) => {
        setApiPaymentMethods(
          methods.map((m) => ({
            label: m.label,
            value: m.value,
            pct: m.pct,
            color: PAYMENT_COLORS[m.label] ?? '#6B7280',
          }))
        );
      })
      .catch(() => setApiPaymentMethods(null));
    fetchTopSellingProducts(5)
      .then((rows) => {
        const totalSold = rows.reduce((sum, p) => sum + p.sold, 0) || 1;
        setApiProducts(
          rows.map((p) => {
            const priceNum = Number(String(p.price).replace(/[^\d.]/g, "")) || 0;
            const value = priceNum * p.sold;
            return {
              name: p.name,
              qty: p.sold,
              value,
              pct: (p.sold / totalSold) * 100,
              uri: p.image || "",
            };
          })
        );
      })
      .catch(() => setApiProducts(null));
  }, [selectedRange, selectedChannel]);

  const emptyChannel = {
    channels: [] as Channel[],
    total: 0,
    orders: 0,
    aov: 0,
    returns: 0,
    cancels: 0,
    replacements: 0,
  };
  const channelData = apiOverview
    ? {
        channels: apiOverview.channels,
        total: apiOverview.total,
        orders: apiOverview.orders,
        aov: apiOverview.aov,
        returns: apiOverview.returns,
        cancels: apiOverview.cancels,
        replacements: apiOverview.replacements,
      }
    : emptyChannel;
  const products = apiProducts ?? [];
  const paymentMethods = apiPaymentMethods ?? [];
  const paymentTotal = paymentMethods.reduce((sum, item) => sum + item.value, 0);
  const dateRangeLabel = `${formatDateShort(filterStart)} – ${formatDateShort(filterEnd)} ${filterEnd.getFullYear()}`;

  const kpiItems = [
    { label: "Total Sales", value: `₹${formatInr(channelData.total)}`, icon: "wallet-outline", color: C.navy, bg: '#EEF4FF', iconBg: '#DDE8FF', delta: "12.5%", deltaUp: true },
    { label: "Total Orders", value: String(channelData.orders), icon: "bag-handle-outline", color: C.green, bg: '#EFFBF5', iconBg: '#DDF8E9', delta: "8.3%", deltaUp: true },
    { label: "Average Order Value", value: `₹${formatInr(channelData.aov)}`, icon: "cart-outline", color: "#7C3AED", bg: '#F6F0FF', iconBg: '#EEE0FF', delta: "7.2%", deltaUp: true },
    { label: "Returns", value: String(channelData.returns), icon: "refresh-outline", color: "#F59E0B", bg: '#FFF7ED', iconBg: '#FFE7CC', delta: "33.3%", deltaUp: false },
    { label: "Cancels", value: String(channelData.cancels), icon: "close-circle-outline", color: "#E11D48", bg: '#FFF1F2', iconBg: '#FFE0E3', delta: "16.7%", deltaUp: false },
    { label: "Replacements", value: String(channelData.replacements), icon: "swap-horizontal-outline", color: "#16A34A", bg: '#F0FDF4', iconBg: '#DCFCE7', delta: "20.0%", deltaUp: true },
  ];

  const renderContent = () => (
    <>
      {/* ── Sales Overview ── */}
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>Sales Overview</Text>
          <TouchableOpacity activeOpacity={0.7} style={s.linkBtn} onPress={() => router.push('/(main)/earning')}>
            <Text style={s.linkText}>View Analytics</Text>
            <Ionicons name="chevron-forward" size={14} color={C.navyDeep} />
          </TouchableOpacity>
        </View>

        <View style={s.overviewGrid}>
          {kpiItems.map((item, idx) => (
            <View key={idx} style={[s.overviewBox, { backgroundColor: item.bg }, kpiWidth ? { width: kpiWidth as any } : null]}>
              <View style={[s.overviewIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={s.overviewLabel}>{item.label}</Text>
              <Text style={s.overviewValue}>{item.value}</Text>
              <View style={s.deltaRow}>
                <Ionicons name={item.deltaUp ? "caret-up" : "caret-down"} size={12} color={item.deltaUp ? C.green : C.red} />
                <Text style={[s.deltaText, { color: item.deltaUp ? C.green : C.red }]}>{item.delta}</Text>
                <Text style={s.deltaVs}>vs last 7 days</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Row 2: Sales Trend + Payment Method */}
      <View style={isWebLayout ? s.rowWeb : null}>
        <View style={isWebLayout ? s.colWeb60 : { width: '100%' }}>
          {/* ── Sales Trend ── */}
          <View style={[s.card, { flex: 1 }]}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>Sales Trend</Text>
              <RangeDropdown
                selected={selectedRange}
                onSelect={setSelectedRange}
                onCustomRange={() => setShowTrendCal(true)}
              />
            </View>
            <SalesTrendChart
              range={selectedRange}
              customFrom={selectedRange === 'Custom Date Range' ? filterStart : undefined}
              customTo={selectedRange === 'Custom Date Range' ? filterEnd : undefined}
            />
          </View>
        </View>

        <View style={isWebLayout ? s.colWeb40 : { width: '100%' }}>
          {/* ── Sales by Payment Method ── */}
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.sectionTitle}>Sales by Payment Method</Text>
            <Text style={s.tapHint}>Tap a segment to see its label</Text>
            <View style={s.paymentCardCenter}>
              <PaymentDonut methods={paymentMethods} total={paymentTotal} />
            </View>
            <View style={s.channelList}>
              {paymentMethods.map((pm, idx) => (
                <View key={pm.label} style={[s.channelItem, idx !== paymentMethods.length - 1 && s.channelItemBorder]}>
                  <View style={s.channelLeft}>
                    <View style={[s.dot, { backgroundColor: pm.color }]} />
                    <Text style={s.channelLabel}>{pm.label}</Text>
                  </View>
                  <View style={s.channelMiddle}>
                    <Text style={s.channelValue}>₹{formatInr(pm.value)}</Text>
                  </View>
                  <View style={s.channelRight}>
                    <Text style={s.channelPct}>{pm.pct.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Row 3: Top Selling Products + Weekly Summary */}
      <View style={isWebLayout ? s.rowWeb : null}>
        <View style={isWebLayout ? s.colWeb60 : { width: '100%' }}>
          {/* ── Top Selling Products ── */}
          <View style={[s.card, { flex: 1 }]}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>Top Selling Products</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(main)/Topsellingproducts')}>
                <Text style={s.linkText}>View All</Text>
              </TouchableOpacity>
            </View>
            {products.map((p, idx) => (
              <View key={p.name} style={[s.productRow, idx !== 0 && s.productBorder]}>
                <Image source={{ uri: p.uri }} style={s.productImage} />
                <View style={s.productMid}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productQty}>Qty: {p.qty}</Text>
                </View>
                <View style={s.productRight}>
                  <Text style={s.productPrice}>₹{formatInr(p.value)}</Text>
                  <View style={s.pctPill}><Text style={s.pctText}>{p.pct.toFixed(1)}%</Text></View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={isWebLayout ? s.colWeb40 : { width: '100%' }}>
          {/* ── This Week Summary ── */}
          <View style={[s.summaryCard, { flex: 1 }]}>
            <View style={s.summaryLeft}>
              <View style={s.summaryIcon}>
                <MaterialCommunityIcons name="file-document-outline" size={22} color={C.navy} />
              </View>
              <View style={s.flex1}>
                <Text style={s.summaryTitle}>This Week Summary</Text>
                <Text style={s.summaryText}>
                  You&apos;ve made ₹{formatInr(channelData.total)} sales
                  {selectedChannel !== 'All Channels' ? ` via ${selectedChannel}` : ''} this week.
                  That&apos;s 12.5% more than the previous 7 days.
                </Text>
              </View>
            </View>
            <View style={s.summaryRight}>
              <View style={s.summaryPctRow}>
                <Ionicons name="trending-up" size={18} color={C.green} />
                <Text style={s.summaryPct}>12.5%</Text>
              </View>
              <Text style={s.summaryVs}>vs last 7 days</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.container} edges={['left', 'right', 'bottom']}>
      {/* Filter bar calendar */}
      <CalendarPicker visible={showFilterCal} startDate={filterStart} endDate={filterEnd}
        onConfirm={(s, e) => { setFilterStart(s); setFilterEnd(e); }}
        onClose={() => setShowFilterCal(false)} mode="range" />

      {/* Header calendar icon */}
      <CalendarPicker visible={showHeaderCal} startDate={filterStart} endDate={filterEnd}
        onConfirm={(s, e) => { setFilterStart(s); setFilterEnd(e); }}
        onClose={() => setShowHeaderCal(false)} mode="range" />

      {/* ── NEW: Sales Trend "Custom Date Range" calendar ── */}
      <CalendarPicker visible={showTrendCal} startDate={filterStart} endDate={filterEnd}
        onConfirm={(s, e) => { setFilterStart(s); setFilterEnd(e); }}
        onClose={() => setShowTrendCal(false)} mode="range" />

      {/* ── Header on Mobile only ── */}
      {Platform.OS !== 'web' && (
        <View style={s.headerShell}>
          <AppHeader
            title="Total Sales"
            showBackButton
            rightActions={
              <TouchableOpacity activeOpacity={0.7} style={s.headerIconBtn} onPress={() => setShowHeaderCal(true)}>
                <Ionicons name="calendar-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            }
          />

          {/* ── Filters ── */}
          <View style={s.filterCard}>
            <TouchableOpacity activeOpacity={0.7} style={s.filterItem} onPress={() => setShowFilterCal(true)}>
              <View style={s.filterLeft}>
                <Ionicons name="calendar-outline" size={18} color={C.textLight} />
                <Text style={s.filterText}>{dateRangeLabel}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={C.textLight} />
            </TouchableOpacity>
            <ChannelDropdown selected={selectedChannel} onSelect={setSelectedChannel} />
          </View>
        </View>
      )}

      {Platform.OS === 'web' ? (
        <View style={s.scrollContent}>
          <View style={s.webWrapper}>
            {/* ── Header on Web only ── */}
            <View style={s.webHeaderRow}>
              <View style={s.webHeaderLeft}>
                <Text style={s.webPageTitle}>Total Sales</Text>
                <Text style={s.webPageSubtitle}>Analyze your business performance and revenue breakdown</Text>
              </View>
              <View style={s.webHeaderRight}>
                <TouchableOpacity activeOpacity={0.7} style={s.webFilterItem} onPress={() => setShowFilterCal(true)}>
                  <Ionicons name="calendar-outline" size={16} color={C.textMid} />
                  <Text style={s.webFilterText}>{dateRangeLabel}</Text>
                  <Ionicons name="chevron-down" size={14} color={C.textLight} />
                </TouchableOpacity>
                <ChannelDropdown selected={selectedChannel} onSelect={setSelectedChannel} style={s.webChannelDropdown} />
              </View>
            </View>

            {renderContent()}
          </View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {renderContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default TotalSalesScreen;

// ─── Calendar Styles ──────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        // @ts-ignore
        backdropFilter: 'blur(8px)',
      },
      default: {
        justifyContent: 'flex-end',
      }
    })
  },
  sheet: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 20,
    ...Platform.select({
      web: {
        width: 360,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      },
      default: {
        width: '100%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }
    })
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
  rangeDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FB', borderRadius: 16, padding: 12, marginBottom: 16, gap: 8 },
  rangeBox: { flex: 1, borderRadius: 12, padding: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  rangeBoxActive: { borderColor: C.navy, backgroundColor: '#EEF4FF' },
  rangeDivider: { paddingHorizontal: 4 },
  rangeLabel: { fontSize: 11, color: C.textLight, fontWeight: '600', marginBottom: 2 },
  rangeValue: { fontSize: 13, fontWeight: '700', color: C.textDark },
  rangeValueActive: { color: C.navy },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  monthTitle: { fontSize: 16, fontWeight: '800', color: C.textDark },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 6,
    width: CELL_SIZE * 7,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  dayName: { width: CELL_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '700', color: C.textLight },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE * 7,
    alignSelf: 'center',
  },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cellInRange: { backgroundColor: '#EEF4FF' },
  rangeConnectLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: '50%',
    backgroundColor: '#EEF4FF',
  },
  rangeConnectRight: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#EEF4FF',
  },
  cellContent: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: (CELL_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cellSelected: { backgroundColor: C.navy },
  cellText: { fontSize: 14, fontWeight: '600', color: C.textDark },
  cellTextInRange: { color: C.navy, fontWeight: '700' },
  cellTextSelected: { color: C.white, fontWeight: '800' },
  confirmBtn: { marginTop: 20, backgroundColor: C.navy, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: C.white, fontSize: 16, fontWeight: '800' },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex1: { flex: 1 },
  headerShell: { backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  filterCard: {
    backgroundColor: C.white, borderRadius: 16, marginHorizontal: 16, marginTop: -33,
    padding: 12, flexDirection: 'row', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  filterItem: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white,
  },
  filterLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  filterRight: { flex: 1, paddingRight: 8 },
  filterText: { flexShrink: 1, fontSize: 13, lineHeight: 16, color: C.textDark, fontWeight: '600' },
  scrollContent: {
    ...Platform.select({
      web: {
        paddingHorizontal: 0,
        marginHorizontal: -14, // Offsets WebLayout's padding to set side margins to exactly 10px
        paddingTop: 0,
        paddingBottom: 24,
      },
      default: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
      }
    })
  },
  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  trendSection: { paddingVertical: 8, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textDark },
  tapHint: { fontSize: 11, color: C.textLight, fontWeight: '600', marginTop: 4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { color: C.navyDeep, fontWeight: '800', fontSize: 13 },
  overviewRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  overviewBox: {
    borderRadius: 18,
    padding: 14,
    ...Platform.select({
      web: {
        // Controlled dynamically in JS for responsive 3-column / 2-column formatting
      },
      default: {
        width: (SW - 32 - 12) / 2,
      }
    })
  },
  overviewIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  overviewLabel: { marginTop: 12, fontSize: 12, fontWeight: '700', color: C.textMid },
  overviewValue: { marginTop: 6, fontSize: 20, fontWeight: '800', color: C.textDark },
  deltaRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  deltaText: { fontSize: 12, fontWeight: '800' },
  deltaVs: { fontSize: 12, color: C.textLight, fontWeight: '600' },
  dropdownBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
    minWidth: 180,
  },
  dropdownText: { fontSize: 13, fontWeight: '700', color: C.textDark },
  dropdownMenu: {
    position: 'absolute', backgroundColor: C.white, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 10, borderWidth: 1, borderColor: C.border,
  },
  dropdownSectionHeader: {
    backgroundColor: '#F5F7FB', paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#E8ECF4',
  },
  dropdownSectionLabel: { fontSize: 10, fontWeight: '800', color: C.textLight, letterSpacing: 0.8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: C.orange },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: C.textDark },
  dropdownItemTextActive: { color: C.white, fontWeight: '800' },
  channelOptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  channelOptDot: { width: 10, height: 10, borderRadius: 5 },
  trendRow: { flexDirection: 'row', marginTop: 14 },
  yAxis: { width: 46, paddingTop: 4, justifyContent: 'space-between', paddingBottom: 22 },
  yAxisLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  trendChartWrap: { position: 'relative' },
  tooltip: { position: 'absolute', backgroundColor: C.navyDeep, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  tooltipDate: { color: C.white, fontSize: 11, fontWeight: '600' },
  tooltipAmount: { marginTop: 2, color: C.white, fontSize: 14, fontWeight: '800' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingRight: 2 },
  xAxisLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  channelRow: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' },
  paymentCardCenter: { alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 8 },
  donutBox: {
    ...Platform.select({
      web: {
        width: 380,
        height: 320,
      },
      default: {
        width: 260,
        height: 220,
      }
    }),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  donutSvg: {},
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutCenterLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  donutCenterValue: { marginTop: 4, fontSize: Platform.OS === 'web' ? 16 : 13, fontWeight: '900', color: C.textDark },
  channelList: { marginTop: 16 },
  channelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, justifyContent: 'space-between' },
  channelItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)' },
  channelLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  channelMiddle: { width: 120, alignItems: 'flex-start' },
  channelRight: { width: 64, alignItems: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  channelLabel: { fontSize: 13, fontWeight: '700', color: C.textDark },
  channelValue: { fontSize: 13, fontWeight: '800', color: C.navyDeep },
  channelPct: { fontSize: 12, fontWeight: '600', color: C.textLight },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  productBorder: { borderTopWidth: 1, borderTopColor: '#EFF2F7' },
  productImage: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#F3F4F6' },
  productMid: { flex: 1, paddingLeft: 12 },
  productName: { fontSize: 14, fontWeight: '800', color: C.textDark },
  productQty: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  productRight: { alignItems: 'flex-end' },
  productPrice: { fontSize: 14, fontWeight: '900', color: C.textDark },
  pctPill: { marginTop: 8, backgroundColor: '#E7F0FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pctText: { color: C.navyDeep, fontWeight: '900', fontSize: 12 },
  summaryCard: {
    backgroundColor: '#EEF4FF', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E5EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '900', color: C.textDark },
  summaryText: { marginTop: 6, fontSize: 12, lineHeight: 16, color: C.textMid, fontWeight: '600' },
  summaryRight: { alignItems: 'flex-end' },
  summaryPctRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryPct: { fontSize: 22, fontWeight: '900', color: C.green },
  summaryVs: { marginTop: 3, fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  webWrapper: {
    width: '100%',
    gap: 16,
    ...Platform.select({
      web: {
        marginTop: -14, // Offsets WebLayout top padding to exactly 10px
      },
      default: {}
    })
  },
  rowWeb: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
      },
      default: {},
    }),
  },
  colWeb60: {
    ...Platform.select({
      web: {
        flex: 1.5,
      },
      default: {
        width: '100%',
      },
    }),
  },
  colWeb40: {
    ...Platform.select({
      web: {
        flex: 1,
      },
      default: {
        width: '100%',
      },
    }),
  },
  webHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  webHeaderLeft: {
    flex: 1,
    minWidth: 300,
  },
  webPageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.navyDeep,
  },
  webPageSubtitle: {
    fontSize: 14,
    color: C.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webFilterItem: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    minHeight: 38,
  },
  webFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textDark,
  },
  webChannelDropdown: {
    flex: 0,
    minWidth: 140,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.white,
    minHeight: 38,
  },
});