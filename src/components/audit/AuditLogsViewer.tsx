'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Download, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  LOGIN: { bg: 'bg-green-100', text: 'text-green-800' },
  CREATE_ORDER: { bg: 'bg-blue-100', text: 'text-blue-800' },
  UPDATE_ORDER: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  DELETE_ORDER: { bg: 'bg-red-100', text: 'text-red-800' },
  APPROVE_ORDER: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  REJECT_ORDER: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  useEffect(() => {
    fetchLogs();
  }, [searchUser, filterAction, filterResource, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchUser) params.append('userId', searchUser);
      if (filterAction && filterAction !== 'all') params.append('action', filterAction);
      if (filterResource && filterResource !== 'all') params.append('resource', filterResource);
      params.append('limit', limit.toString());
      params.append('skip', (page * limit).toString());

      const response = await fetch(`/api/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast({ title: 'Erro ao carregar logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const csv = [
        ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Recurso', 'ID Recurso', 'IP', 'Detalhes'].join(','),
        ...logs.map(log =>
          [
            new Date(log.createdAt).toLocaleString('pt-BR'),
            log.user.name,
            log.user.email,
            log.action,
            log.resource,
            log.resourceId || '-',
            log.ipAddress || '-',
            log.details ? JSON.stringify(log.details) : '-',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Logs exportados com sucesso!' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erro ao exportar logs', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setSearchUser('');
    setFilterAction('all');
    setFilterResource('all');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Atividades</CardTitle>
        <CardDescription>
          Visualize todas as ações realizadas pelos usuários no sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Filtrar por ID de usuário..."
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Select value={filterAction} onValueChange={(v) => {
              setFilterAction(v);
              setPage(0);
            }}>
              <SelectTrigger className="min-w-48">
                <SelectValue placeholder="Filtrar por ação..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="CREATE_ORDER">Criar Pedido</SelectItem>
                <SelectItem value="UPDATE_ORDER">Atualizar Pedido</SelectItem>
                <SelectItem value="DELETE_ORDER">Deletar Pedido</SelectItem>
                <SelectItem value="APPROVE_ORDER">Aprovar Pedido</SelectItem>
                <SelectItem value="REJECT_ORDER">Rejeitar Pedido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterResource} onValueChange={(v) => {
              setFilterResource(v);
              setPage(0);
            }}>
              <SelectTrigger className="min-w-48">
                <SelectValue placeholder="Filtrar por recurso..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os recursos</SelectItem>
                <SelectItem value="Auth">Autenticação</SelectItem>
                <SelectItem value="Order">Pedido</SelectItem>
                <SelectItem value="User">Usuário</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="Limpar filtros"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={exportLogs}
              disabled={logs.length === 0}
              title="Exportar como CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Total de registros: <strong>{total}</strong>
          </p>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>ID Recurso</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const actionColor = ACTION_COLORS[log.action] || {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                  };

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-mono">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{log.user.name}</p>
                          <p className="text-xs text-gray-500">{log.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${actionColor.bg} ${actionColor.text}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.resource}</TableCell>
                      <TableCell className="text-sm font-mono text-gray-600">
                        {log.resourceId || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-600">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
