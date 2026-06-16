export const DASHBOARD_MENU_CONFIG = {
  topItems: [
    { label: 'Visão Geral', icon: 'LayoutDashboard', path: '/dashboard' },
  ],

  vendasSubItems: [
    { label: 'Pedidos de Venda', icon: 'ShoppingCart', path: '/dashboard/vendas/pedidos' },
    { label: 'CRM', icon: 'Handshake', path: '/dashboard/vendas/crm' },
    { label: 'Cotação', icon: 'FileCheck', path: '/dashboard/vendas/cotacao' },
    { label: 'Clientes', icon: 'Users', path: '/dashboard/vendas/clientes' },
    { label: 'Preços e Equipe', icon: 'CirclePercent', path: '/dashboard/vendas/configuracoes' },
  ],

  producaoSubItems: [
    { label: 'Fila de Produção', icon: 'Warehouse', path: '/dashboard/producao/fila' },
    { label: 'Estoque', icon: 'Box', path: '/dashboard/producao/estoque' },
    { label: 'Carregamento', icon: 'BoxesIcon', path: '/dashboard/producao/carregamento' },
    { label: 'Produtos', icon: 'ShoppingBag', path: '/dashboard/producao/produtos' },
  ],

  relatoriosSubItems: [
    { label: 'Índice', icon: 'BarChart3', path: '/dashboard/relatorios' },
    { label: 'Comercial', icon: 'TrendingUp', path: '/dashboard/relatorios/comercial' },
    { label: 'Entregas', icon: 'Truck', path: '/dashboard/relatorios/entregas' },
    { label: 'Carregamento', icon: 'BoxesIcon', path: '/dashboard/relatorios/carregamento' },
    { label: 'Estoque', icon: 'Box', path: '/dashboard/relatorios/estoque' },
    { label: 'Comissões', icon: 'CreditCard', path: '/dashboard/relatorios/comissao' },
  ],

  logisticaSubItems: [
    { label: 'Montagem', icon: 'Package', path: '/dashboard/logistica/montagem' },
    { label: 'Liberado', icon: 'Truck', path: '/dashboard/logistica/liberado' },
    { label: 'Agenda de Entrega', icon: 'Calendar', path: '/dashboard/logistica/agenda' },
  ],
};
