'use client';

import { useSystemData } from '@/server/store';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/settings/protected-route';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, ScatterChart, Scatter, Legend, LineChart, Line,
    AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import {
    Edit3, Loader2, AlertCircle, Maximize2, Minimize2,
    TrendingUp, TrendingDown, Zap, Target, Award, MapPin
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    isWithinInterval, getDay, isWeekend, getDaysInMonth, getDate
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SCREEN_DURATION = 15000; // 15 segundos por tela
const TOTAL_SCREENS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtBRLk = (v: number) => `R$ ${(v / 1000).toFixed(1)}k`;

const workingDaysSoFar = () => {
    const today = new Date();
    const start = startOfMonth(today);
    let count = 0;
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        if (!isWeekend(d)) count++;
    }
    return count;
};

const workingDaysInMonth = () => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (!isWeekend(d)) count++;
    }
    return count;
};

// ─── Componentes de Tela ──────────────────────────────────────────────────────

/** Tela 1 — KPIs + Metas */
function Screen1({
    monthMetrics, goalMetrics, currentGoal, statusMetrics, projectionMetrics
}: any) {
    const revPct = goalMetrics.revenuePercentage;
    const tonPct = goalMetrics.tonsPercentage;

    return (
        <div style={s.screenGrid1}>
            {/* KPI Faturamento */}
            <div style={{ ...s.kpiCard, gridColumn: '1 / 2' }}>
                <div style={s.kpiHeader}>
                    <span style={s.kpiEyebrow}>💰 FATURAMENTO NO MÊS</span>
                    {currentGoal && (
                        <span style={{
                            ...s.badge,
                            background: revPct >= 100 ? '#14532d' : revPct >= 70 ? '#713f12' : '#7f1d1d',
                            color: revPct >= 100 ? '#4ade80' : revPct >= 70 ? '#fbbf24' : '#f87171',
                        }}>
                            {revPct.toFixed(1)}% DA META
                        </span>
                    )}
                </div>
                <div style={s.kpiBigValue}>
                    {fmtBRLk(monthMetrics.totalRevenue)}
                </div>
                {currentGoal && (
                    <>
                        <div style={s.kpiMetaRow}>
                            <span style={s.kpiMetaLabel}>Meta: {fmtBRLk(currentGoal.revenue)}</span>
                            <span style={s.kpiMetaLabel}>
                                {goalMetrics.revenueRemaining > 0
                                    ? `Faltam ${fmtBRLk(goalMetrics.revenueRemaining)}`
                                    : '✅ Atingido'}
                            </span>
                        </div>
                        <div style={s.progressTrack}>
                            <div style={{
                                ...s.progressBar,
                                width: `${revPct}%`,
                                background: revPct >= 100
                                    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                    : revPct >= 70
                                        ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                                        : 'linear-gradient(90deg,#dc2626,#f87171)',
                            }} />
                        </div>
                    </>
                )}
                {/* Projeção */}
                <div style={s.projRow}>
                    <TrendingUp size={14} color="#10b981" />
                    <span style={s.projLabel}>Projeção final: </span>
                    <span style={s.projValue}>{fmtBRLk(projectionMetrics.projectedRevenue)}</span>
                    <span style={{
                        ...s.projDiff,
                        color: projectionMetrics.projectedRevenue >= (currentGoal?.revenue || 0) ? '#4ade80' : '#f87171'
                    }}>
                        {currentGoal
                            ? projectionMetrics.projectedRevenue >= currentGoal.revenue
                                ? `+${fmtBRLk(projectionMetrics.projectedRevenue - currentGoal.revenue)} acima`
                                : `${fmtBRLk(projectionMetrics.projectedRevenue - currentGoal.revenue)} abaixo`
                            : ''}
                    </span>
                </div>
            </div>

            {/* KPI Toneladas */}
            <div style={{ ...s.kpiCard, gridColumn: '2 / 3' }}>
                <div style={s.kpiHeader}>
                    <span style={s.kpiEyebrow}>📦 TONELADAS VENDIDAS</span>
                    {currentGoal && (
                        <span style={{
                            ...s.badge,
                            background: tonPct >= 100 ? '#14532d' : tonPct >= 70 ? '#713f12' : '#7f1d1d',
                            color: tonPct >= 100 ? '#4ade80' : tonPct >= 70 ? '#fbbf24' : '#f87171',
                        }}>
                            {tonPct.toFixed(1)}% DA META
                        </span>
                    )}
                </div>
                <div style={s.kpiBigValue}>
                    {monthMetrics.totalTons.toFixed(1)}
                    <span style={s.kpiUnit}>t</span>
                </div>
                {currentGoal && (
                    <>
                        <div style={s.kpiMetaRow}>
                            <span style={s.kpiMetaLabel}>Meta: {currentGoal.tons.toFixed(1)}t</span>
                            <span style={s.kpiMetaLabel}>
                                {goalMetrics.tonsRemaining > 0
                                    ? `Faltam ${goalMetrics.tonsRemaining.toFixed(1)}t`
                                    : '✅ Atingido'}
                            </span>
                        </div>
                        <div style={s.progressTrack}>
                            <div style={{
                                ...s.progressBar,
                                width: `${tonPct}%`,
                                background: tonPct >= 100
                                    ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                    : tonPct >= 70
                                        ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                                        : 'linear-gradient(90deg,#dc2626,#f87171)',
                            }} />
                        </div>
                    </>
                )}
                <div style={s.projRow}>
                    <TrendingUp size={14} color="#10b981" />
                    <span style={s.projLabel}>Projeção final: </span>
                    <span style={s.projValue}>{projectionMetrics.projectedTons.toFixed(1)}t</span>
                    <span style={{
                        ...s.projDiff,
                        color: projectionMetrics.projectedTons >= (currentGoal?.tons || 0) ? '#4ade80' : '#f87171'
                    }}>
                        {currentGoal
                            ? projectionMetrics.projectedTons >= currentGoal.tons
                                ? `+${(projectionMetrics.projectedTons - currentGoal.tons).toFixed(1)}t acima`
                                : `${(projectionMetrics.projectedTons - currentGoal.tons).toFixed(1)}t abaixo`
                            : ''}
                    </span>
                </div>
            </div>

            {/* Status Cards */}
            <div style={{ ...s.statusRow, gridColumn: '1 / 3' }}>
                {[
                    { icon: '📋', label: 'PRODUÇÃO', value: statusMetrics.emProducao, color: '#f59e0b' },
                    { icon: '📦', label: 'LOGÍSTICA', value: statusMetrics.emLogistica, color: '#3b82f6' },
                    { icon: '🚚', label: 'EM ROTA', value: statusMetrics.emEntrega, color: '#8b5cf6' },
                    { icon: '✅', label: 'ENTREGUES', value: statusMetrics.entregues, color: '#22c55e' },
                    { icon: '❌', label: 'REJEITADOS', value: statusMetrics.rejeitados, color: '#ef4444' },
                    { icon: '🎯', label: 'ATIVOS', value: statusMetrics.totalAtivos, color: '#06b6d4' },
                    { icon: '📊', label: 'EFICIÊNCIA', value: `${statusMetrics.eficienciaEntrega}%`, color: '#10b981' },
                    { icon: '💼', label: 'PEDIDOS/MÊS', value: monthMetrics.count, color: '#a78bfa' },
                ].map((item, i) => (
                    <div key={i} style={{ ...s.statChip, borderColor: item.color + '55' }}>
                        <span style={s.statChipIcon}>{item.icon}</span>
                        <span style={{ ...s.statChipValue, color: item.color }}>{item.value}</span>
                        <span style={s.statChipLabel}>{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Mini KPIs */}
            <div style={{ ...s.miniRow, gridColumn: '1 / 3' }}>
                <div style={s.miniKpi}>
                    <div style={s.miniKpiLabel}>TICKET MÉDIO</div>
                    <div style={s.miniKpiValue}>
                        {monthMetrics.count > 0 ? fmtBRLk(monthMetrics.totalRevenue / monthMetrics.count) : 'R$ 0'}
                    </div>
                </div>
                <div style={s.miniKpi}>
                    <div style={s.miniKpiLabel}>PREÇO / KG</div>
                    <div style={s.miniKpiValue}>
                        R$ {monthMetrics.totalTons > 0
                            ? (monthMetrics.totalRevenue / (monthMetrics.totalTons * 1000)).toFixed(2)
                            : '0,00'}
                    </div>
                </div>
                <div style={s.miniKpi}>
                    <div style={s.miniKpiLabel}>PESO MÉDIO / PEDIDO</div>
                    <div style={s.miniKpiValue}>
                        {monthMetrics.count > 0 ? (monthMetrics.totalTons / monthMetrics.count).toFixed(2) : '0'}t
                    </div>
                </div>
                <div style={s.miniKpi}>
                    <div style={s.miniKpiLabel}>VELOCIDADE (€/DIA ÚTIL)</div>
                    <div style={s.miniKpiValue}>
                        {fmtBRLk(projectionMetrics.revenuePerWorkingDay)}
                    </div>
                </div>
                <div style={s.miniKpi}>
                    <div style={s.miniKpiLabel}>DIAS ÚTEIS RESTANTES</div>
                    <div style={s.miniKpiValue}>{projectionMetrics.remainingWorkingDays}</div>
                </div>
            </div>
        </div>
    );
}

/** Tela 2 — Gráficos */
function Screen2({ timeSeriesData, cityScatterData }: any) {
    return (
        <div style={s.screenGrid2}>
            <div style={s.chartCard}>
                <div style={s.chartTitle}>📈 FATURAMENTO DIÁRIO NO MÊS</div>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.12)" vertical={false} />
                        <XAxis
                            dataKey="data"
                            tick={{ fill: '#6ee7b7', fontSize: 11, fontWeight: 700 }}
                            axisLine={false} tickLine={false}
                            interval={Math.floor(timeSeriesData.length / 8)}
                        />
                        <YAxis
                            tick={{ fill: '#6ee7b7', fontSize: 11 }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <RechartsTooltip
                            contentStyle={{ background: '#0f2418', border: '1px solid #16a34a', borderRadius: 8, color: '#d1fae5' }}
                            formatter={(v: any) => [fmtBRL(v), 'Faturamento']}
                        />
                        <Area
                            type="monotone"
                            dataKey="faturamento"
                            stroke="#16a34a"
                            strokeWidth={3}
                            fill="url(#areaGrad)"
                            dot={{ fill: '#16a34a', r: 3 }}
                            activeDot={{ r: 6, fill: '#4ade80' }}
                            name="Faturamento"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={s.chartCard}>
                <div style={s.chartTitle}>📦 PEDIDOS POR DIA</div>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeriesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.12)" vertical={false} />
                        <XAxis
                            dataKey="data"
                            tick={{ fill: '#6ee7b7', fontSize: 11, fontWeight: 700 }}
                            axisLine={false} tickLine={false}
                            interval={Math.floor(timeSeriesData.length / 8)}
                        />
                        <YAxis tick={{ fill: '#6ee7b7', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                            contentStyle={{ background: '#0f2418', border: '1px solid #16a34a', borderRadius: 8, color: '#d1fae5' }}
                        />
                        <Bar dataKey="pedidos" name="Pedidos" radius={[6, 6, 0, 0]}>
                            {timeSeriesData.map((_: any, i: number) => (
                                <Cell key={i} fill={`rgba(22,163,74,${0.4 + (i / timeSeriesData.length) * 0.6})`} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={s.chartCard}>
                <div style={s.chartTitle}>🗺️ CIDADES — TICKET MÉDIO vs TONELADAS</div>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.12)" />
                        <XAxis
                            type="number" dataKey="ticketMedio" name="Ticket Médio"
                            tick={{ fill: '#6ee7b7', fontSize: 10 }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            type="number" dataKey="toneladas" name="Toneladas"
                            tick={{ fill: '#6ee7b7', fontSize: 10 }}
                            axisLine={false} tickLine={false}
                        />
                        <RechartsTooltip
                            contentStyle={{ background: '#0f2418', border: '1px solid #16a34a', borderRadius: 8, color: '#d1fae5' }}
                            formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(2) : v, n]}
                            content={({ payload }) => {
                                if (!payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div style={{ background: '#0f2418', border: '1px solid #16a34a', borderRadius: 8, padding: '8px 12px', color: '#d1fae5', fontSize: 12 }}>
                                        <div style={{ fontWeight: 900, color: '#4ade80', marginBottom: 4 }}>{d.city}</div>
                                        <div>Ticket: {fmtBRL(d.ticketMedio)}</div>
                                        <div>Toneladas: {d.toneladas.toFixed(2)}t</div>
                                        <div>Pedidos: {d.count}</div>
                                    </div>
                                );
                            }}
                        />
                        <Scatter name="Cidades" data={cityScatterData} fill="#16a34a" opacity={0.85} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/** Tela 3 — Rankings */
function Screen3({ cityRanking, projectionMetrics, monthMetrics, currentGoal, goalMetrics }: any) {
    const top5 = cityRanking.slice(0, 5);
    const maxRev = top5[0]?.totalValue || 1;

    return (
        <div style={s.screenGrid3}>
            {/* Ranking de cidades */}
            <div style={{ ...s.rankCard, gridColumn: '1 / 2' }}>
                <div style={s.chartTitle}>🏆 RANKING DE CIDADES — FATURAMENTO</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'space-around' }}>
                    {top5.map((city: any, i: number) => {
                        const pct = (city.totalValue / maxRev) * 100;
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return (
                            <div key={city.city} style={s.rankRow}>
                                <span style={s.rankMedal}>{medals[i]}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={s.rankCityRow}>
                                        <span style={s.rankCityName}>{city.city}</span>
                                        <span style={s.rankCityValue}>{fmtBRLk(city.totalValue)}</span>
                                    </div>
                                    <div style={s.rankTrack}>
                                        <div style={{
                                            ...s.rankBar,
                                            width: `${pct}%`,
                                            background: ['#ffd700', '#c0c0c0', '#cd7f32', '#6ee7b7', '#a78bfa'][i],
                                        }} />
                                    </div>
                                    <div style={s.rankSub}>
                                        {city.count} pedidos · {city.totalTons.toFixed(1)}t · {fmtBRLk(city.avgTicket)}/pedido
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Coluna direita: projeção + velocidade */}
            <div style={{ gridColumn: '2 / 3', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Projeção visual */}
                <div style={s.projCard}>
                    <div style={s.chartTitle}>🎯 PROJEÇÃO DE FECHAMENTO</div>
                    <div style={s.projGrid}>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>FATURAMENTO PROJETADO</div>
                            <div style={{ ...s.projBlockValue, color: projectionMetrics.projectedRevenue >= (currentGoal?.revenue || 0) ? '#4ade80' : '#f87171' }}>
                                {fmtBRLk(projectionMetrics.projectedRevenue)}
                            </div>
                            {currentGoal && (
                                <div style={{ ...s.projBlockSub, color: projectionMetrics.projectedRevenue >= currentGoal.revenue ? '#4ade80' : '#f87171' }}>
                                    {projectionMetrics.projectedRevenue >= currentGoal.revenue
                                        ? `✅ +${fmtBRLk(projectionMetrics.projectedRevenue - currentGoal.revenue)} acima da meta`
                                        : `⚠️ ${fmtBRLk(projectionMetrics.projectedRevenue - currentGoal.revenue)} abaixo da meta`}
                                </div>
                            )}
                        </div>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>TONELADAS PROJETADAS</div>
                            <div style={{ ...s.projBlockValue, color: projectionMetrics.projectedTons >= (currentGoal?.tons || 0) ? '#4ade80' : '#f87171' }}>
                                {projectionMetrics.projectedTons.toFixed(1)}t
                            </div>
                            {currentGoal && (
                                <div style={{ ...s.projBlockSub, color: projectionMetrics.projectedTons >= currentGoal.tons ? '#4ade80' : '#f87171' }}>
                                    {projectionMetrics.projectedTons >= currentGoal.tons
                                        ? `✅ +${(projectionMetrics.projectedTons - currentGoal.tons).toFixed(1)}t acima`
                                        : `⚠️ ${(projectionMetrics.projectedTons - currentGoal.tons).toFixed(1)}t abaixo`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Velocidade de vendas */}
                <div style={s.projCard}>
                    <div style={s.chartTitle}>⚡ VELOCIDADE DE VENDAS</div>
                    <div style={s.projGrid}>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>FATURAMENTO / DIA ÚTIL</div>
                            <div style={{ ...s.projBlockValue, color: '#fbbf24' }}>
                                {fmtBRLk(projectionMetrics.revenuePerWorkingDay)}
                            </div>
                        </div>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>TONELADAS / DIA ÚTIL</div>
                            <div style={{ ...s.projBlockValue, color: '#fbbf24' }}>
                                {projectionMetrics.tonsPerWorkingDay.toFixed(2)}t
                            </div>
                        </div>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>DIAS ÚTEIS PASSADOS</div>
                            <div style={{ ...s.projBlockValue, color: '#a78bfa' }}>
                                {projectionMetrics.workingDaysSoFar}
                            </div>
                        </div>
                        <div style={s.projBlock}>
                            <div style={s.projBlockLabel}>DIAS ÚTEIS RESTANTES</div>
                            <div style={{ ...s.projBlockValue, color: '#a78bfa' }}>
                                {projectionMetrics.remainingWorkingDays}
                            </div>
                        </div>
                    </div>

                    {/* Necessário por dia para bater a meta */}
                    {currentGoal && goalMetrics && (
                        <div style={s.neededRow}>
                            <Zap size={16} color="#fbbf24" />
                            <span style={s.neededText}>
                                Para bater a meta de faturamento, precisa de{' '}
                                <strong style={{ color: '#fbbf24' }}>
                                    {projectionMetrics.remainingWorkingDays > 0
                                        ? fmtBRLk(Math.max(0, (currentGoal.revenue - monthMetrics.totalRevenue) / projectionMetrics.remainingWorkingDays))
                                        : 'R$ 0'} / dia útil
                                </strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function CockpitContent() {
    const { orders, salesGoals, isReady } = useSystemData();
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ revenue: '', tons: '', notes: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentScreen, setCurrentScreen] = useState(0);
    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const screenRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Fullscreen listener
    useEffect(() => {
        const fn = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', fn);
        return () => document.removeEventListener('fullscreenchange', fn);
    }, []);

    // Rotação de telas + barra de progresso
    useEffect(() => {
        setProgress(0);
        const tick = 100; // ms
        let elapsed = 0;

        if (progressRef.current) clearInterval(progressRef.current);
        if (screenRef.current) clearInterval(screenRef.current);

        progressRef.current = setInterval(() => {
            elapsed += tick;
            setProgress((elapsed / SCREEN_DURATION) * 100);
        }, tick);

        screenRef.current = setInterval(() => {
            setCurrentScreen(prev => (prev + 1) % TOTAL_SCREENS);
            elapsed = 0;
            setProgress(0);
        }, SCREEN_DURATION);

        return () => {
            if (progressRef.current) clearInterval(progressRef.current);
            if (screenRef.current) clearInterval(screenRef.current);
        };
    }, [currentScreen]);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
        else await document.exitFullscreen();
    };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentGoal = useMemo(() =>
        salesGoals.find(g => g.month === currentMonth && g.year === currentYear),
        [salesGoals, currentMonth, currentYear]
    );

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthOrders = useMemo(() =>
        orders.filter(o => {
            const d = new Date(o.createdAt);
            return d >= monthStart && d <= monthEnd;
        }),
        [orders]
    );

    const billedOrders = useMemo(() =>
        monthOrders.filter(o => ['FATURADO', 'ENTREGA', 'AGUARDANDO_FATURAMENTO'].includes(o.status)),
        [monthOrders]
    );

    const monthMetrics = useMemo(() => {
        const totalRevenue = billedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
        const totalTons = billedOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0) / 1000;
        return { totalRevenue, totalTons, count: billedOrders.length };
    }, [billedOrders]);

    const statusMetrics = useMemo(() => {
        const emProducao = orders.filter(o => o.status === 'PRODUCAO').length;
        const emLogistica = orders.filter(o => ['PRONTO_LOGISTICA', 'AGUARDANDO_FATURAMENTO'].includes(o.status)).length;
        const emEntrega = orders.filter(o => o.status === 'ENTREGA').length;
        const entregues = orders.filter(o => o.status === 'ENTREGUE').length;
        const rejeitados = orders.filter(o => o.status === 'REJEITADO').length;
        const totalAtivos = emProducao + emLogistica + emEntrega;
        const totalProcessados = entregues + rejeitados;
        return {
            emProducao, emLogistica, emEntrega, entregues, rejeitados, totalAtivos, totalProcessados,
            eficienciaEntrega: totalProcessados > 0 ? ((entregues / totalProcessados) * 100).toFixed(1) : '0',
        };
    }, [orders]);

    const goalMetrics = useMemo(() => {
        const revPct = currentGoal?.revenue ? (monthMetrics.totalRevenue / currentGoal.revenue) * 100 : 0;
        const tonPct = currentGoal?.tons ? (monthMetrics.totalTons / currentGoal.tons) * 100 : 0;
        return {
            revenuePercentage: Math.min(revPct, 100),
            tonsPercentage: Math.min(tonPct, 100),
            revenueRemaining: Math.max((currentGoal?.revenue || 0) - monthMetrics.totalRevenue, 0),
            tonsRemaining: Math.max((currentGoal?.tons || 0) - monthMetrics.totalTons, 0),
        };
    }, [currentGoal, monthMetrics]);

    const projectionMetrics = useMemo(() => {
        const wdSoFar = workingDaysSoFar();
        const wdTotal = workingDaysInMonth();
        const wdRemaining = wdTotal - wdSoFar;
        const revenuePerWD = wdSoFar > 0 ? monthMetrics.totalRevenue / wdSoFar : 0;
        const tonsPerWD = wdSoFar > 0 ? monthMetrics.totalTons / wdSoFar : 0;
        return {
            projectedRevenue: revenuePerWD * wdTotal,
            projectedTons: tonsPerWD * wdTotal,
            revenuePerWorkingDay: revenuePerWD,
            tonsPerWorkingDay: tonsPerWD,
            workingDaysSoFar: wdSoFar,
            remainingWorkingDays: wdRemaining,
        };
    }, [monthMetrics]);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const timeSeriesData = useMemo(() =>
        daysInMonth.map(day => {
            const dayOrders = billedOrders.filter(o => {
                const od = new Date(o.createdAt);
                const s = new Date(day); s.setHours(0, 0, 0, 0);
                const e = new Date(day); e.setHours(23, 59, 59, 999);
                return od >= s && od <= e;
            });
            return {
                data: format(day, 'dd/MM'),
                pedidos: dayOrders.length,
                faturamento: dayOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0),
            };
        }),
        [billedOrders]
    );

    const cityScatterData = useMemo(() => {
        const map: Record<string, { count: number; value: number; peso: number }> = {};
        billedOrders.forEach(o => {
            const city = o.city || 'Sem Cidade';
            if (!map[city]) map[city] = { count: 0, value: 0, peso: 0 };
            map[city].count++;
            map[city].value += o.totalValue || 0;
            map[city].peso += o.totalWeight || 0;
        });
        return Object.entries(map).map(([city, d]) => ({
            city,
            ticketMedio: d.count > 0 ? d.value / d.count : 0,
            toneladas: d.peso / 1000,
            count: d.count,
        }));
    }, [billedOrders]);

    const cityRanking = useMemo(() => {
        const map: Record<string, { count: number; value: number; peso: number }> = {};
        billedOrders.forEach(o => {
            const city = o.city || 'Sem Cidade';
            if (!map[city]) map[city] = { count: 0, value: 0, peso: 0 };
            map[city].count++;
            map[city].value += o.totalValue || 0;
            map[city].peso += o.totalWeight || 0;
        });
        return Object.entries(map)
            .map(([city, d]) => ({
                city,
                count: d.count,
                totalValue: d.value,
                totalTons: d.peso / 1000,
                avgTicket: d.count > 0 ? d.value / d.count : 0,
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [billedOrders]);

    const handleSaveGoal = async () => {
        try {
            setIsLoading(true);
            const revenue = parseFloat(formData.revenue) || 0;
            const tons = parseFloat(formData.tons) || 0;
            if (revenue < 0 || tons < 0) {
                toast({ title: 'Erro', description: 'Valores devem ser maiores que zero', variant: 'destructive' });
                return;
            }
            if (editingGoalId && currentGoal) {
                const res = await fetch(`/api/sales-goals/${currentGoal.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ revenue, tons, notes: formData.notes || null }),
                });
                if (!res.ok) throw new Error('Erro ao atualizar meta');
                toast({ title: 'Sucesso', description: 'Meta atualizada com sucesso' });
            } else {
                const res = await fetch('/api/sales-goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: currentMonth, year: currentYear, revenue, tons, notes: formData.notes || null }),
                });
                if (!res.ok) throw new Error('Erro ao criar meta');
                toast({ title: 'Sucesso', description: 'Meta criada com sucesso' });
            }
            window.location.reload();
        } catch (err) {
            toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao salvar meta', variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setIsEditingGoal(false);
            setEditingGoalId(null);
            setFormData({ revenue: '', tons: '', notes: '' });
        }
    };

    const handleEditClick = () => {
        if (currentGoal) {
            setFormData({ revenue: currentGoal.revenue.toString(), tons: currentGoal.tons.toString(), notes: currentGoal.notes || '' });
            setEditingGoalId(currentGoal.id);
        } else {
            setFormData({ revenue: '', tons: '', notes: '' });
            setEditingGoalId(null);
        }
        setIsEditingGoal(true);
    };

    if (!isReady) {
        return (
            <div style={s.loadingScreen}>
                <div style={s.loadingSpinner} />
                <span style={s.loadingText}>Carregando cockpit...</span>
            </div>
        );
    }

    const screenLabels = ['KPIs & METAS', 'GRÁFICOS', 'RANKINGS'];

    return (
        <div ref={containerRef} style={s.root}>
            {/* Background */}
            <div style={s.bgGrid} />
            <div style={s.bgGlow1} />
            <div style={s.bgGlow2} />

            {/* Header */}
            <div style={s.header}>
                <div style={s.headerLeft}>
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={52}
                        height={52}
                        style={{ borderRadius: 10, boxShadow: '0 0 20px rgba(22,163,74,0.5)' }}
                    />
                    <div>
                        <div style={s.headerTitle}>NOVOCIOLO COCKPIT</div>
                        <div style={s.headerSub}>Resumo Comercial · Ensacados</div>
                    </div>
                </div>

                <div style={s.headerCenter}>
                    {/* Indicadores de tela */}
                    <div style={s.screenNav}>
                        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentScreen(i)}
                                style={{
                                    ...s.screenDot,
                                    background: i === currentScreen ? '#16a34a' : 'rgba(22,163,74,0.2)',
                                    transform: i === currentScreen ? 'scale(1.2)' : 'scale(1)',
                                }}
                                title={screenLabels[i]}
                            />
                        ))}
                    </div>
                    <div style={s.screenLabel}>{screenLabels[currentScreen]}</div>

                    {/* Data / Hora */}
                    <div style={s.clock}>
                        <div style={s.clockTime}>
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={s.clockDate}>
                            {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}
                        </div>
                    </div>
                </div>

                <div style={s.headerRight}>
                    <button style={s.iconBtn} onClick={handleEditClick} title="Editar meta">
                        <Edit3 size={18} />
                    </button>
                    <button style={s.iconBtn} onClick={toggleFullscreen} title="Tela cheia">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Barra de progresso da tela */}
            <div style={s.progressOuter}>
                <div style={{ ...s.progressInner, width: `${progress}%` }} />
            </div>

            {/* Conteúdo da tela com transição */}
            <div style={s.screenWrapper}>
                {currentScreen === 0 && (
                    <Screen1
                        monthMetrics={monthMetrics}
                        goalMetrics={goalMetrics}
                        currentGoal={currentGoal}
                        statusMetrics={statusMetrics}
                        projectionMetrics={projectionMetrics}
                    />
                )}
                {currentScreen === 1 && (
                    <Screen2
                        timeSeriesData={timeSeriesData}
                        cityScatterData={cityScatterData}
                    />
                )}
                {currentScreen === 2 && (
                    <Screen3
                        cityRanking={cityRanking}
                        projectionMetrics={projectionMetrics}
                        monthMetrics={monthMetrics}
                        currentGoal={currentGoal}
                        goalMetrics={goalMetrics}
                    />
                )}
            </div>

            {/* Footer com observações */}
            {currentGoal?.notes && (
                <div style={s.footerNotes}>
                    <span style={{ color: '#fbbf24', fontWeight: 900, marginRight: 8 }}>📌</span>
                    {currentGoal.notes}
                </div>
            )}

            {/* Modal */}
            <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
                <DialogContent className="max-w-md bg-white border-green-200 text-slate-900">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">
                            {currentGoal ? 'Atualizar Meta do Mês' : 'Definir Meta do Mês'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-widest">Faturamento (R$)</Label>
                            <Input
                                type="number" placeholder="Ex: 240000"
                                value={formData.revenue}
                                onChange={e => setFormData(p => ({ ...p, revenue: e.target.value }))}
                                disabled={isLoading}
                                className="bg-green-50 border-green-300 text-slate-900 font-bold"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-widest">Toneladas</Label>
                            <Input
                                type="number" placeholder="Ex: 50"
                                value={formData.tons}
                                onChange={e => setFormData(p => ({ ...p, tons: e.target.value }))}
                                disabled={isLoading}
                                className="bg-green-50 border-green-300 text-slate-900 font-bold"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-widest">Observações</Label>
                            <Input
                                type="text" placeholder="Ex: Mês de pico"
                                value={formData.notes}
                                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                disabled={isLoading}
                                className="bg-green-50 border-green-300 text-slate-900"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setIsEditingGoal(false); setEditingGoalId(null); setFormData({ revenue: '', tons: '', notes: '' }); }}
                            disabled={isLoading}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveGoal} disabled={isLoading} className="gap-2 bg-green-600 hover:bg-green-700">
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        width: '100vw', height: '100vh',
        background: '#060f0a',
        color: '#e2e8f0',
        display: 'flex', flexDirection: 'column',
        padding: '12px 16px', gap: 10,
        boxSizing: 'border-box',
        position: 'relative', overflow: 'hidden',
        fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    },
    bgGrid: {
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
            linear-gradient(rgba(16,185,129,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
    },
    bgGlow1: {
        position: 'absolute', top: -300, left: -300, width: 800, height: 800,
        borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
    },
    bgGlow2: {
        position: 'absolute', bottom: -300, right: -300, width: 800, height: 800,
        borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(5,150,105,0.06) 0%, transparent 70%)',
    },

    // Header
    header: {
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 12,
        padding: '10px 20px',
        backdropFilter: 'blur(12px)',
        gap: 16, flex: '0 0 auto',
    },
    headerLeft: {
        display: 'flex', alignItems: 'center', gap: 14, flex: '0 0 auto',
    },
    headerTitle: {
        fontSize: 18, fontWeight: 900, letterSpacing: '0.18em',
        color: '#4ade80',
        textShadow: '0 0 20px rgba(74,222,128,0.4)',
    },
    headerSub: {
        fontSize: 10, letterSpacing: '0.15em', color: '#6ee7b7', fontWeight: 600,
    },
    headerCenter: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
    },
    screenNav: {
        display: 'flex', gap: 8, alignItems: 'center',
    },
    screenDot: {
        width: 10, height: 10, borderRadius: '50%',
        border: '1px solid rgba(22,163,74,0.4)',
        cursor: 'pointer', padding: 0,
        transition: 'all 0.3s ease',
    },
    screenLabel: {
        fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', color: '#6ee7b7',
    },
    clock: {
        textAlign: 'center',
    },
    clockTime: {
        fontSize: 22, fontWeight: 900, color: '#4ade80',
        letterSpacing: '0.08em', lineHeight: 1,
        textShadow: '0 0 12px rgba(74,222,128,0.3)',
    },
    clockDate: {
        fontSize: 8, color: '#6ee7b7', letterSpacing: '0.12em', fontWeight: 600,
    },
    headerRight: {
        display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto',
    },
    iconBtn: {
        background: 'rgba(22,163,74,0.1)',
        border: '1px solid rgba(22,163,74,0.3)',
        borderRadius: 8, color: '#4ade80', cursor: 'pointer',
        padding: '8px 10px', display: 'flex', alignItems: 'center',
        transition: 'all 0.2s',
    },

    // Progress
    progressOuter: {
        height: 3, background: 'rgba(22,163,74,0.15)', borderRadius: 99, overflow: 'hidden',
        flex: '0 0 auto', position: 'relative', zIndex: 2,
    },
    progressInner: {
        height: '100%', background: 'linear-gradient(90deg,#16a34a,#4ade80)',
        borderRadius: 99, transition: 'width 0.1s linear',
        boxShadow: '0 0 8px rgba(74,222,128,0.6)',
    },

    // Screen wrapper
    screenWrapper: {
        flex: 1, minHeight: 0, position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
    },

    // ── TELA 1
    screenGrid1: {
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: 12,
    },
    kpiCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.25)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
        backdropFilter: 'blur(4px)',
    },
    kpiHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    kpiEyebrow: {
        fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#6ee7b7',
    },
    badge: {
        fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 99,
        letterSpacing: '0.08em',
    },
    kpiBigValue: {
        fontSize: 64, fontWeight: 900, color: '#4ade80', lineHeight: 1,
        letterSpacing: '-0.02em',
        textShadow: '0 0 24px rgba(74,222,128,0.3)',
    },
    kpiUnit: {
        fontSize: 32, fontWeight: 700, opacity: 0.7, marginLeft: 6,
    },
    kpiMetaRow: {
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: '#6ee7b7', fontWeight: 700,
    },
    kpiMetaLabel: { fontSize: 11, color: '#6ee7b7', fontWeight: 600 },
    progressTrack: {
        width: '100%', height: 8,
        background: 'rgba(22,163,74,0.1)',
        borderRadius: 99, overflow: 'hidden',
        border: '1px solid rgba(22,163,74,0.15)',
    },
    progressBar: {
        height: '100%', borderRadius: 99,
        transition: 'width 0.8s ease',
    },
    projRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(22,163,74,0.06)',
        borderRadius: 8, padding: '8px 12px',
        border: '1px solid rgba(22,163,74,0.12)',
    },
    projLabel: { fontSize: 11, color: '#6ee7b7', fontWeight: 600 },
    projValue: { fontSize: 13, color: '#4ade80', fontWeight: 900 },
    projDiff: { fontSize: 11, fontWeight: 700, marginLeft: 'auto' },

    statusRow: {
        display: 'flex', gap: 10, flexWrap: 'nowrap',
    },
    statChip: {
        flex: 1, background: 'rgba(255,255,255,0.03)',
        border: '1px solid', borderRadius: 10,
        padding: '10px 8px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 4,
    },
    statChipIcon: { fontSize: 18 },
    statChipValue: { fontSize: 20, fontWeight: 900, lineHeight: 1 },
    statChipLabel: { fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', color: '#9ca3af' },

    miniRow: {
        display: 'flex', gap: 10,
    },
    miniKpi: {
        flex: 1, background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.15)',
        borderRadius: 10, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
    },
    miniKpiLabel: {
        fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', color: '#6b7280',
    },
    miniKpiValue: {
        fontSize: 18, fontWeight: 900, color: '#d1fae5', lineHeight: 1,
    },

    // ── TELA 2
    screenGrid2: {
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 12,
    },
    chartCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 14, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        backdropFilter: 'blur(4px)',
        overflow: 'hidden',
    },
    chartTitle: {
        fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: '#6ee7b7',
        flex: '0 0 auto',
    },

    // ── TELA 3
    screenGrid3: {
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
    },
    rankCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
    },
    rankRow: {
        display: 'flex', alignItems: 'flex-start', gap: 12,
    },
    rankMedal: { fontSize: 22, lineHeight: 1, flex: '0 0 auto', marginTop: 2 },
    rankCityRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 4,
    },
    rankCityName: {
        fontSize: 14, fontWeight: 900, color: '#d1fae5', letterSpacing: '0.04em',
    },
    rankCityValue: {
        fontSize: 14, fontWeight: 900, color: '#4ade80',
    },
    rankTrack: {
        width: '100%', height: 6,
        background: 'rgba(22,163,74,0.1)', borderRadius: 99, overflow: 'hidden', marginBottom: 4,
    },
    rankBar: { height: '100%', borderRadius: 99, transition: 'width 0.8s ease' },
    rankSub: { fontSize: 10, color: '#6b7280', fontWeight: 600 },

    projCard: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 14, padding: '18px 22px',
        display: 'flex', flexDirection: 'column', gap: 14, flex: 1,
    },
    projGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
    },
    projBlock: {
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'rgba(22,163,74,0.05)', borderRadius: 10, padding: '12px 14px',
        border: '1px solid rgba(22,163,74,0.1)',
    },
    projBlockLabel: {
        fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', color: '#6b7280',
    },
    projBlockValue: {
        fontSize: 24, fontWeight: 900, lineHeight: 1, color: '#4ade80',
    },
    projBlockSub: { fontSize: 10, fontWeight: 700, marginTop: 2 },

    neededRow: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(251,191,36,0.06)', borderRadius: 8, padding: '10px 12px',
        border: '1px solid rgba(251,191,36,0.15)',
    },
    neededText: { fontSize: 12, color: '#d1fae5', fontWeight: 600, lineHeight: 1.4 },

    // Footer
    footerNotes: {
        position: 'relative', zIndex: 2,
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 8, padding: '8px 16px',
        fontSize: 12, color: '#fef3c7', fontWeight: 600,
        flex: '0 0 auto', letterSpacing: '0.02em',
    },

    // Loading
    loadingScreen: {
        width: '100vw', height: '100vh',
        background: '#060f0a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, color: '#4ade80',
    },
    loadingSpinner: {
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(22,163,74,0.2)',
        borderTopColor: '#16a34a',
        animation: 'spin 0.8s linear infinite',
    },
    loadingText: {
        fontSize: 11, letterSpacing: '0.25em', fontWeight: 700, color: '#6ee7b7',
    },
};

export default function CockpitPage() {
    return (
        <ProtectedRoute requireAuth={true}>
            <CockpitContent />
        </ProtectedRoute>
    );
}