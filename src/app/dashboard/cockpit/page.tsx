'use client';

import { useSystemData } from '@/server/store';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/frontend/protected-route';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, ScatterChart, Scatter, Legend, LineChart, Line
} from 'recharts';
import { Edit3, Loader2, AlertCircle, Maximize2, Minimize2, DollarSign, Weight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

function CockpitContent() {
    const { orders, salesGoals, isReady } = useSystemData();
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ revenue: '', tons: '', notes: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentGoal = useMemo(() => {
        return salesGoals.find(g => g.month === currentMonth && g.year === currentYear);
    }, [salesGoals, currentMonth, currentYear]);

    const monthMetrics = useMemo(() => {
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const monthOrders = orders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= monthStart && orderDate <= monthEnd;
        });
        const billedOrders = monthOrders.filter(o =>
            ['FATURADO', 'ENTREGA', 'AGUARDANDO_FATURAMENTO'].includes(o.status)
        );
        const totalRevenue = billedOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
        const totalTons = billedOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0) / 1000;
        return { totalRevenue, totalTons, count: billedOrders.length };
    }, [orders]);

    const goalMetrics = useMemo(() => {
        const revenuePercentage = currentGoal?.revenue
            ? (monthMetrics.totalRevenue / currentGoal.revenue) * 100
            : 0;
        const tonsPercentage = currentGoal?.tons
            ? (monthMetrics.totalTons / currentGoal.tons) * 100
            : 0;
        return {
            revenuePercentage: Math.min(revenuePercentage, 100),
            tonsPercentage: Math.min(tonsPercentage, 100),
            revenueRemaining: Math.max((currentGoal?.revenue || 0) - monthMetrics.totalRevenue, 0),
            tonsRemaining: Math.max((currentGoal?.tons || 0) - monthMetrics.totalTons, 0),
        };
    }, [currentGoal, monthMetrics]);

    // Dados de pedidos ao longo do tempo
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const timeSeriesData = useMemo(() => {
        return daysInMonth.map(day => {
            const dayOrders = orders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return isWithinInterval(orderDate, {
                    start: new Date(day.setHours(0, 0, 0, 0)),
                    end: new Date(day.setHours(23, 59, 59, 999)),
                });
            }).filter(o => ['FATURADO', 'ENTREGA', 'AGUARDANDO_FATURAMENTO'].includes(o.status));
            
            return {
                data: format(day, 'dd/MM'),
                pedidos: dayOrders.length,
                faturamento: dayOrders.reduce((sum, o) => sum + (o.totalValue || 0), 0),
            };
        });
    }, [orders]);

    // Dados de cidades com ticket médio e toneladas (para scatter)
    const cityScatterData = useMemo(() => {
        const cityMap: Record<string, { count: number; value: number; peso: number }> = {};
        const monthOrders = orders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= monthStart && orderDate <= monthEnd;
        }).filter(o => ['FATURADO', 'ENTREGA', 'AGUARDANDO_FATURAMENTO'].includes(o.status));

        monthOrders.forEach(o => {
            const city = o.city || 'Sem Cidade';
            if (!cityMap[city]) cityMap[city] = { count: 0, value: 0, peso: 0 };
            cityMap[city].count++;
            cityMap[city].value += o.totalValue || 0;
            cityMap[city].peso += o.totalWeight || 0;
        });

        return Object.entries(cityMap).map(([city, data]) => ({
            city,
            ticketMedio: data.count > 0 ? data.value / data.count : 0,
            toneladas: data.peso / 1000,
            count: data.count,
        }));
    }, [orders]);

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
                const response = await fetch(`/api/sales-goals/${currentGoal.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ revenue, tons, notes: formData.notes || null }),
                });
                if (!response.ok) throw new Error('Erro ao atualizar meta');
                toast({ title: 'Sucesso', description: 'Meta atualizada com sucesso' });
            } else {
                const response = await fetch('/api/sales-goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: currentMonth, year: currentYear, revenue, tons, notes: formData.notes || null }),
                });
                if (!response.ok) throw new Error('Erro ao criar meta');
                toast({ title: 'Sucesso', description: 'Meta criada com sucesso' });
            }

            window.location.reload();
        } catch (error) {
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao salvar meta',
                variant: 'destructive',
            });
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
            <div style={styles.loadingScreen}>
                <div style={styles.loadingDot} />
                <span style={styles.loadingText}>Carregando cockpit...</span>
            </div>
        );
    }

    const revPct = goalMetrics.revenuePercentage;
    const tonPct = goalMetrics.tonsPercentage;

    return (
        <div ref={containerRef} style={styles.root}>
            {/* Fundo animado */}
            <div style={styles.bgGrid} />
            <div style={styles.bgGlow1} />
            <div style={styles.bgGlow2} />

            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Image
                        src="/logo.png"
                        alt="NovoCiclo Logo"
                        width={60}
                        height={60}
                        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}
                    />
                    <div>
                        <div style={styles.headerTitle}>🚀 Resumo Comercial Ensacados - NovoCiclo</div>
                        <div style={styles.headerSub}>
                            {format(now, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}
                        </div>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <div style={styles.clockBlock}>
                        <div style={styles.clockTime}>
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={styles.clockDate}>
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                    </div>
                    <button style={styles.iconBtn} onClick={handleEditClick} title="Editar meta">
                        <Edit3 size={18} />
                    </button>
                    <button style={styles.iconBtn} onClick={toggleFullscreen} title="Tela cheia">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Grid principal */}
            <div style={styles.mainGrid}>

                {/* --- COLUNA ESQUERDA --- */}
                <div style={styles.leftCol}>

                    {/* KPI Faturamento */}
                    <div style={{ ...styles.kpiCard, borderColor: revPct >= 100 ? '#16a34a' : '#22c55e' }}>
                        <div style={styles.kpiGlow} />
                        <div style={styles.kpiLabel}>💰 FATURAMENTO</div>
                        <div style={{ ...styles.kpiValue, color: revPct >= 100 ? '#16a34a' : '#059669' }}>
                            R$ {(monthMetrics.totalRevenue / 1000).toFixed(1)}
                            <span style={styles.kpiUnit}>k</span>
                        </div>
                        {currentGoal ? (
                            <>
                                <div style={styles.kpiMeta}>
                                    META: R$ {(currentGoal.revenue / 1000).toFixed(0)}k
                                    <span style={{ ...styles.kpiBadge, color: revPct >= 100 ? '#16a34a' : '#059669' }}>
                                        {revPct.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={styles.progressTrack}>
                                    <div style={{
                                        ...styles.progressBar,
                                        width: `${revPct}%`,
                                        background: revPct >= 100
                                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                            : 'linear-gradient(90deg, #059669, #10b981)',
                                        boxShadow: revPct >= 100 ? '0 0 12px #16a34a88' : '0 0 12px #10b98188',
                                    }} />
                                </div>
                                {goalMetrics.revenueRemaining > 0 && (
                                    <div style={styles.kpiRemaining}>
                                        Faltam R$ {(goalMetrics.revenueRemaining / 1000).toFixed(1)}k
                                    </div>
                                )}
                                {revPct >= 100 && <div style={styles.kpiAchieved}>✅ META ATINGIDA!</div>}
                            </>
                        ) : (
                            <div style={styles.noGoal}><AlertCircle size={14} /> Meta não definida</div>
                        )}
                    </div>

                    {/* KPI Toneladas */}
                    <div style={{ ...styles.kpiCard, borderColor: tonPct >= 100 ? '#16a34a' : '#22c55e' }}>
                        <div style={styles.kpiGlow} />
                        <div style={styles.kpiLabel}>📦 TONELADAS VENDIDAS</div>
                        <div style={{ ...styles.kpiValue, color: tonPct >= 100 ? '#16a34a' : '#059669' }}>
                            {monthMetrics.totalTons.toFixed(1)}
                            <span style={styles.kpiUnit}>t</span>
                        </div>
                        {currentGoal ? (
                            <>
                                <div style={styles.kpiMeta}>
                                    META: {currentGoal.tons.toFixed(1)}t
                                    <span style={{ ...styles.kpiBadge, color: tonPct >= 100 ? '#16a34a' : '#059669' }}>
                                        {tonPct.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={styles.progressTrack}>
                                    <div style={{
                                        ...styles.progressBar,
                                        width: `${tonPct}%`,
                                        background: tonPct >= 100
                                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                            : 'linear-gradient(90deg, #059669, #10b981)',
                                        boxShadow: tonPct >= 100 ? '0 0 12px #16a34a88' : '0 0 12px #10b98188',
                                    }} />
                                </div>
                                {goalMetrics.tonsRemaining > 0 && (
                                    <div style={styles.kpiRemaining}>
                                        Faltam {goalMetrics.tonsRemaining.toFixed(1)}t
                                    </div>
                                )}
                                {tonPct >= 100 && <div style={styles.kpiAchieved}>✅ META ATINGIDA!</div>}
                            </>
                        ) : (
                            <div style={styles.noGoal}><AlertCircle size={14} /> Meta não definida</div>
                        )}
                    </div>

                    {/* Mini KPIs */}
                    <div style={styles.miniGrid}>
                        <div style={styles.miniCard}>
                            <div style={styles.miniLabel}>PEDIDOS</div>
                            <div style={styles.miniValue}>{monthMetrics.count}</div>
                            <div style={styles.miniSub}>faturados</div>
                        </div>
                        <div style={styles.miniCard}>
                            <div style={styles.miniLabel}>TICKET MÉDIO</div>
                            <div style={styles.miniValue}>
                                R${monthMetrics.count > 0 ? ((monthMetrics.totalRevenue / monthMetrics.count) / 1000).toFixed(1) : 0}k
                            </div>
                            <div style={styles.miniSub}>por pedido</div>
                        </div>
                        <div style={styles.miniCard}>
                            <div style={styles.miniLabel}>PESO MÉDIO</div>
                            <div style={styles.miniValue}>
                                {monthMetrics.count > 0 ? (monthMetrics.totalTons / monthMetrics.count).toFixed(2) : 0}t
                            </div>
                            <div style={styles.miniSub}>por pedido</div>
                        </div>
                    </div>

                    {/* Cards Preço/Peso */}
                    <div style={styles.miniGrid}>
                        <div style={styles.staticCard}>
                            <DollarSign size={24} color="#059669" strokeWidth={1.5} />
                            <div>
                                <div style={styles.staticLabel}>TOTAL FATURADO</div>
                                <div style={styles.staticValue}>
                                    R$ {(monthMetrics.totalRevenue / 1000).toFixed(1)}k
                                </div>
                            </div>
                        </div>
                        <div style={styles.staticCard}>
                            <Weight size={24} color="#059669" strokeWidth={1.5} />
                            <div>
                                <div style={styles.staticLabel}>PESO TOTAL</div>
                                <div style={styles.staticValue}>
                                    {monthMetrics.totalTons.toFixed(1)}t
                                </div>
                            </div>
                        </div>
                        <div style={styles.staticCard}>
                            <DollarSign size={24} color="#059669" strokeWidth={1.5} />
                            <div>
                                <div style={styles.staticLabel}>PREÇO/KG</div>
                                <div style={styles.staticValue}>
                                    R$ {monthMetrics.totalTons > 0 ? (monthMetrics.totalRevenue / (monthMetrics.totalTons * 1000)).toFixed(2) : 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- COLUNA DIREITA --- */}
                <div style={styles.rightCol}>

                    {/* Gráfico Pedidos ao Longo do Tempo */}
                    <div style={styles.chartCard}>
                        <div style={styles.chartTitle}>📈 PEDIDOS AO LONGO DO TEMPO</div>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" vertical={false} />
                                <XAxis 
                                    dataKey="data" 
                                    tick={{ fill: '#059669', fontSize: 11, fontWeight: 700 }} 
                                    axisLine={false} 
                                    tickLine={false}
                                    interval={Math.floor(timeSeriesData.length / 6)}
                                />
                                <YAxis tick={{ fill: '#059669', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#ffffff', border: '2px solid #16a34a', borderRadius: 8, color: '#047857' }}
                                    cursor={{ stroke: '#16a34a', strokeWidth: 2 }}
                                />
                                <Legend wrapperStyle={{ color: '#059669', fontSize: 12, fontWeight: 700 }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="pedidos" 
                                    stroke="#16a34a" 
                                    strokeWidth={3}
                                    dot={{ fill: '#16a34a', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Pedidos"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Scatter Chart - Cidades */}
                    <div style={styles.chartCard}>
                        <div style={styles.chartTitle}>🗺️ CIDADES: TICKET MÉDIO vs TONELADAS</div>
                        <ResponsiveContainer width="100%" height={280}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.1)" />
                                <XAxis 
                                    type="number" 
                                    dataKey="ticketMedio" 
                                    name="Ticket Médio (R$)" 
                                    tick={{ fill: '#059669', fontSize: 10 }}
                                    label={{ value: 'Ticket Médio (R$)', position: 'insideBottomRight', offset: -10, fill: '#059669', fontWeight: 700 }}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="toneladas" 
                                    name="Toneladas" 
                                    tick={{ fill: '#059669', fontSize: 10 }}
                                    label={{ value: 'Toneladas', angle: -90, position: 'insideLeft', fill: '#059669', fontWeight: 700 }}
                                />
                                <RechartsTooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ background: '#ffffff', border: '2px solid #16a34a', borderRadius: 8, color: '#047857' }}
                                    formatter={(value: any) => value.toFixed(2)}
                                />
                                <Scatter name="Cidades" data={cityScatterData} fill="#16a34a" opacity={0.8} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Observações (abaixo do grid) */}
            {currentGoal?.notes && (
                <div style={styles.notesCard}>
                    <div style={styles.chartTitle}>📌 OBSERVAÇÕES</div>
                    <div style={styles.notesText}>{currentGoal.notes}</div>
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
                                type="number"
                                placeholder="Ex: 240000"
                                value={formData.revenue}
                                onChange={e => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                                disabled={isLoading}
                                className="bg-green-50 border-green-300 text-slate-900 font-bold"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-widest">Toneladas</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 50"
                                value={formData.tons}
                                onChange={e => setFormData(prev => ({ ...prev, tons: e.target.value }))}
                                disabled={isLoading}
                                className="bg-green-50 border-green-300 text-slate-900 font-bold"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-700 text-xs font-bold uppercase tracking-widest">Observações</Label>
                            <Input
                                type="text"
                                placeholder="Ex: Mês de pico de vendas"
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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

const styles: Record<string, React.CSSProperties> = {
    root: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)',
        color: '#1e293b',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        gap: 20,
        boxSizing: 'border-box',
    },
    bgGrid: {
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
      linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16,185,129,0.08) 1px, transparent 1px)
    `,
        backgroundSize: '48px 48px',
    },
    bgGlow1: {
        position: 'absolute', top: -200, left: -200, width: 600, height: 600,
        borderRadius: '50%', zIndex: 0,
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    bgGlow2: {
        position: 'absolute', bottom: -200, right: -200, width: 600, height: 600,
        borderRadius: '50%', zIndex: 0,
        background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    header: {
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '2px solid rgba(16,185,129,0.2)',
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: '0.12em',
        color: '#047857',
        textShadow: '0 0 30px rgba(16,185,129,0.2)',
    },
    headerSub: {
        fontSize: 11,
        letterSpacing: '0.2em',
        color: '#059669',
        marginTop: 4,
        fontWeight: 700,
    },
    headerRight: {
        display: 'flex', alignItems: 'center', gap: 16,
    },
    clockBlock: {
        textAlign: 'right',
    },
    clockTime: {
        fontSize: 26,
        fontWeight: 900,
        color: '#059669',
        letterSpacing: '0.05em',
        lineHeight: 1,
    },
    clockDate: {
        fontSize: 10,
        color: '#078d51',
        letterSpacing: '0.15em',
        marginTop: 3,
        fontWeight: 700,
    },
    iconBtn: {
        background: '#ecfdf5',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 8,
        color: '#059669',
        cursor: 'pointer',
        padding: '8px 10px',
        display: 'flex', alignItems: 'center',
        transition: 'all 0.2s',
    },
    mainGrid: {
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        flex: 1,
    } as React.CSSProperties,
    leftCol: {
        display: 'flex', flexDirection: 'column', gap: 16,
        gridColumn: '1',
        gridRow: '1 / 3',
    },
    rightCol: {
        display: 'flex', flexDirection: 'column', gap: 16,
        gridColumn: '2',
        gridRow: '1 / 3',
    },
    kpiCard: {
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        border: '2px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        flex: '0 1 auto',
        minHeight: '200px',
        transition: 'all 0.3s ease',
        cursor: 'default',
        boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
    },
    kpiGlow: {
        position: 'absolute', top: -40, right: -40,
        width: 150, height: 150, borderRadius: '50%',
        background: 'rgba(16,185,129,0.08)',
        pointerEvents: 'none',
    },
    kpiLabel: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.2em',
        color: '#059669',
        marginBottom: 8,
    },
    kpiValue: {
        fontSize: 52,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: 12,
        color: '#047857',
    },
    kpiUnit: {
        fontSize: 28,
        fontWeight: 700,
        opacity: 0.7,
        marginLeft: 4,
        color: '#078d51',
    },
    kpiMeta: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12,
        color: '#059669',
        fontWeight: 700,
        letterSpacing: '0.05em',
        marginBottom: 8,
    },
    kpiBadge: {
        fontSize: 14,
        fontWeight: 900,
        color: '#059669',
    },
    progressTrack: {
        width: '100%',
        height: 8,
        background: 'rgba(16,185,129,0.1)',
        borderRadius: 99,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        borderRadius: 99,
        transition: 'width 1s ease',
    },
    kpiRemaining: {
        fontSize: 11,
        color: '#d97706',
        fontWeight: 700,
        letterSpacing: '0.05em',
    },
    kpiAchieved: {
        fontSize: 11,
        color: '#22c55e',
        fontWeight: 900,
        letterSpacing: '0.1em',
    },
    noGoal: {
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12,
        color: '#d97706',
        fontWeight: 700,
    },
    miniGrid: {
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 12,
        width: '100%',
    },
    miniCard: {
        background: '#ffffff',
        border: '2px solid rgba(16,185,129,0.2)',
        borderRadius: 12,
        padding: '16px 14px',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        cursor: 'default',
        boxShadow: '0 2px 8px rgba(16,185,129,0.06)',
    },
    miniLabel: {
        fontSize: 9,
        fontWeight: 900,
        color: '#059669',
        letterSpacing: '0.15em',
        marginBottom: 6,
    },
    miniValue: {
        fontSize: 24,
        fontWeight: 900,
        color: '#047857',
        letterSpacing: '-0.02em',
        lineHeight: 1,
    },
    miniSub: {
        fontSize: 9,
        color: '#078d51',
        marginTop: 4,
        fontWeight: 600,
        letterSpacing: '0.05em',
    },
    chartCard: {
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        border: '2px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: '18px 22px',
        flex: '0 1 auto',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
    },
    chartTitle: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.2em',
        color: '#059669',
        marginBottom: 12,
    },
    notesCard: {
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        border: '2px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: '16px 22px',
        gridColumn: '1 / -1',
        marginTop: 4,
        boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
    },
    notesText: {
        fontSize: 14,
        color: '#047857',
        fontWeight: 500,
        lineHeight: 1.6,
    },
    loadingScreen: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#059669',
    },
    loadingDot: {
        width: 12, height: 12,
        borderRadius: '50%',
        background: '#16a34a',
        animation: 'pulse 1.5s infinite',
    },
    loadingText: {
        fontSize: 12,
        letterSpacing: '0.2em',
        fontWeight: 700,
        color: '#059669',
    },
    staticCard: {
        background: '#ffffff',
        border: '2px solid rgba(16,185,129,0.3)',
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 2px 8px rgba(16,185,129,0.06)',
    },
    staticLabel: {
        fontSize: 10,
        fontWeight: 900,
        color: '#059669',
        letterSpacing: '0.1em',
    },
    staticValue: {
        fontSize: 20,
        fontWeight: 900,
        color: '#047857',
    },
};

export default function CockpitPage() {
    return (
        <ProtectedRoute requireAuth={true}>
            <CockpitContent />
        </ProtectedRoute>
    );
}