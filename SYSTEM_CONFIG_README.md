# 🎛️ Sistema de Configurações de Regras de Negócio

Um sistema completo para gerenciar as regras de negócio do seu sistema de forma intuitiva através da interface web.

## 📋 Visão Geral

O sistema permite que administradores configurem parâmetros críticos do negócio como:

- ✅ Pedido mínimo (peso e valor)
- ✅ Bloqueios automáticos (sem estoque, cliente inadimplente)
- ✅ Prazos padrão (pagamento, entrega, produção)
- ✅ Limites e alertas (desconto máximo, estoque mínimo)
- ✅ Comportamentos do sistema (agrupamento automático, entregas com atraso)

## 🏗️ Arquitetura

### 1. **Database Layer** (`prisma/schema.prisma`)
```prisma
model SystemConfig {
  id    String @id @default(cuid())
  key   String @unique        // ex: PEDIDO_MINIMO_KG
  value String                // JSON: armazena qualquer tipo de valor
  type  String                // 'boolean', 'number', 'string', 'select'
}
```

### 2. **API Layer** (`src/app/api/system-config/route.ts`)
- `GET /api/system-config` - Buscar todas as configurações
- `POST /api/system-config` - Salvar múltiplas configurações
- `PATCH /api/system-config` - Atualizar uma configuração específica

### 3. **Component Layer**
- `ConfigFieldComponent` - Campo individual (input, checkbox, select, etc)
- `ConfigSectionComponent` - Agrupa campos em seções

### 4. **UI Layer** (`src/app/dashboard/configuracoes/painel/page.tsx`)
Painel com abas para diferentes categorias:
- 📊 Vendas
- 🏭 Produção  
- 🚚 Logística
- 📦 Estoque
- ⚙️ Geral

### 5. **Hooks** (`src/hooks/use-system-config.ts`)
```typescript
// Buscar todas as configurações
const configs = useSystemConfig();

// Buscar uma configuração específica
const [pedidoMinimo, loading, error] = useSystemConfig('PEDIDO_MINIMO_KG');
```

## 🚀 Como Usar

### Para Adicionar Uma Nova Configuração

#### 1. No Painel de Controle

Edite `src/app/dashboard/configuracoes/painel/page.tsx` e adicione ao array `configSections`:

```typescript
{
  id: 'vendas',
  title: 'Configurações de Vendas',
  fields: [
    {
      key: 'DESCONTO_MAXIMO',           // Identificador único
      label: 'Desconto Máximo (%)',     // Exibição
      description: 'Máximo desconto...',// Ajuda
      type: 'number',                   // Tipo do campo
      value: configs.DESCONTO_MAXIMO ?? 5,
      placeholder: '5',
      min: 0,
      max: 100,
    },
    // ... mais campos
  ],
}
```

#### 2. Use em Componentes

```typescript
import { useConfig } from '@/hooks/use-system-config';

function MeuComponente() {
  const descontoMaximo = useConfig('DESCONTO_MAXIMO');

  return (
    <div>
      Desconto máximo permitido: {descontoMaximo}%
    </div>
  );
}
```

#### 3. Validar Pedidos (Exemplo)

```typescript
import { validateOrderRules } from '@/lib/order-validation';

async function handleCreateOrder(order) {
  const validation = await validateOrderRules(order);
  
  if (!validation.isValid) {
    validation.errors.forEach(error => console.log(error));
    return; // Bloqueia criação
  }
  
  // Criar pedido...
}
```

## 📚 Tipos de Campo

### Boolean (Checkbox)
```typescript
{
  key: 'PRODUCAO_ATIVA',
  label: 'Produção Ativa',
  type: 'boolean',
  value: true,
}
```
Resultado: Checkbox com estados Habilitado/Desabilitado

### Number (Input Numérico)
```typescript
{
  key: 'PEDIDO_MINIMO_KG',
  label: 'Pedido Mínimo (kg)',
  type: 'number',
  value: 10,
  min: 0,
  max: 1000,
}
```
Resultado: Input com validação de range

### String (Texto)
```typescript
{
  key: 'EMPRESA_NOME',
  label: 'Nome da Empresa',
  type: 'string',
  value: 'Novo Ciclo',
  placeholder: 'Digite o nome',
}
```
Resultado: Input de texto simples

### Select (Dropdown)
```typescript
{
  key: 'NIVEL_ALERTA_ESTOQUE',
  label: 'Nível de Alerta',
  type: 'select',
  value: 'medio',
  options: [
    { label: 'Baixo', value: 'baixo' },
    { label: 'Médio', value: 'medio' },
    { label: 'Alto', value: 'alto' },
  ],
}
```
Resultado: Dropdown com opções

## 🔧 Migrações Prisma

Após adicionar o modelo `SystemConfig`, execute:

```bash
npx prisma migrate dev --name add_system_config
npx prisma db push
```

## 💾 Exemplos de Configurações

### Exemplo 1: Bloquear Pedido Sem Estoque
```typescript
// No painel
{
  key: 'BLOQUEAR_PEDIDO_SEM_ESTOQUE',
  type: 'boolean',
  value: true,
}

// No validador
if (configs.BLOQUEAR_PEDIDO_SEM_ESTOQUE && !temEstoque) {
  throw new Error('Sem estoque disponível');
}
```

### Exemplo 2: Pedido Mínimo com Alerta
```typescript
// No painel
{
  key: 'PEDIDO_MINIMO_KG',
  type: 'number',
  value: 10,
}

// No componente
function CreateOrder() {
  const pedidoMin = useConfig('PEDIDO_MINIMO_KG');
  
  return (
    <Alert>
      Pedido mínimo: {pedidoMin} kg
    </Alert>
  );
}
```

### Exemplo 3: Controle de Desconto
```typescript
// No painel
{
  key: 'DESCONTO_MAXIMO_VENDEDOR',
  type: 'number',
  value: 5,
}

// Na validação
const descontoMax = configs.DESCONTO_MAXIMO_VENDEDOR;
if (descontoAplicado > descontoMax) {
  return {
    isValid: false,
    errors: [`Desconto máximo permitido: ${descontoMax}%`],
  };
}
```

## 🎯 Casos de Uso

1. **Controle de Vendas**
   - Pedido mínimo (peso/valor)
   - Desconto máximo
   - Bloqueio por inadimplência

2. **Controle de Produção**
   - Lote mínimo
   - Tempo de produção padrão
   - Permissão de produção antecipada

3. **Logística**
   - Agrupamento automático de rotas
   - Distância máxima
   - Prazo de entrega padrão

4. **Estoque**
   - Alertas de baixo estoque
   - Bloqueio de venda com estoque negativo

5. **Segurança**
   - Limites de operação
   - Regras de validação

## 📝 Checklist para Implementação

- [ ] Adicionar modelo `SystemConfig` ao Prisma
- [ ] Executar migração do Prisma
- [ ] Implementar campos no painel de controle
- [ ] Criar validadores específicos para seu caso de uso
- [ ] Integrar validação nos componentes
- [ ] Testar fluxo completo (salvar → usar)
- [ ] Documentar novas configurações

## 🐛 Troubleshooting

### Configurações não aparecem no painel
- Verifique se a migração foi executada: `npx prisma migrate status`
- Restart do servidor: `npm run dev`

### Valores não são salvos
- Verifique logs da API: `POST /api/system-config` retorna 200
- Verifique permissões do usuário (requer ADMIN)

### Hook retorna undefined
- As configurações carregam de forma assíncrona
- Use loading state: `const [value, loading] = useSystemConfig('KEY')`

## 📖 Referências

- [Documentação de Hooks](../../hooks/use-system-config.ts)
- [Exemplo de Validação](../../lib/order-validation.ts)
- [API System Config](../../app/api/system-config/route.ts)
