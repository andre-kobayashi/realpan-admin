#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Real Pan — Finance Admin Sub-Pages Setup
# Rodar no servidor admin como: bash setup-finance-pages.sh
# ═══════════════════════════════════════════════════════════

set -e

ADMIN_DIR=~/htdocs/realpan.co.jp/realpan-frontend/realpan-admin

echo "💰 Configurando páginas financeiras do admin..."
echo ""

cd "$ADMIN_DIR"

# ═══ STEP 1: Create directory structure ═══
echo "📂 Step 1: Criando estrutura de pastas..."
mkdir -p src/app/dashboard/finance/pending
mkdir -p src/app/dashboard/finance/invoices
mkdir -p src/app/dashboard/finance/reports
echo "  ✅ Pastas criadas"

# ═══ STEP 2: Copy page files ═══
echo ""
echo "📄 Step 2: Copiando arquivos..."

# The files should be uploaded to the admin server first
# finance-pending-page.tsx → src/app/dashboard/finance/pending/page.tsx
# finance-invoices-page.tsx → src/app/dashboard/finance/invoices/page.tsx
# finance-reports-page.tsx → src/app/dashboard/finance/reports/page.tsx

echo "  ⚠ Copie os 3 arquivos para as pastas corretas:"
echo "    finance-pending-page.tsx → src/app/dashboard/finance/pending/page.tsx"
echo "    finance-invoices-page.tsx → src/app/dashboard/finance/invoices/page.tsx"
echo "    finance-reports-page.tsx → src/app/dashboard/finance/reports/page.tsx"

# ═══ STEP 3: Update Breadcrumbs ═══
echo ""
echo "🔗 Step 3: Atualizando breadcrumbs..."

python3 << 'PYEOF'
fp = 'src/components/layout/Breadcrumbs.tsx'
with open(fp, 'r') as f:
    c = f.read()

changed = False

# Add pending breadcrumb
if "'pending'" not in c or "Pendentes" not in c:
    # Try to add after finance entry
    if "finance:" in c:
        c = c.replace(
            "finance: { pt: 'Financeiro', ja: '財務管理' },",
            "finance: { pt: 'Financeiro', ja: '財務管理' },\n  pending: { pt: 'Pendentes', ja: '入金待ち' },\n  invoices: { pt: 'Faturas PJ', ja: '請求書管理' },\n  reports: { pt: 'Relatórios', ja: 'レポート' },"
        )
        changed = True
        print("  ✅ Breadcrumbs adicionados (pending, invoices, reports)")
    else:
        print("  ⚠ 'finance:' não encontrado no breadcrumbs — adicionando manualmente")
        # Find the translations object and add all
        if "const translations" in c or "translations:" in c:
            # Generic approach: add before the last closing brace of translations
            print("  ℹ️ Verifique manualmente se os breadcrumbs foram adicionados corretamente")
else:
    print("  ⚠ Breadcrumbs de pending já existem — pulando")

if changed:
    with open(fp, 'w') as f:
        f.write(c)

PYEOF

# ═══ STEP 4: Add navigation links in the main finance page ═══
echo ""
echo "🔗 Step 4: Adicionando links de navegação na página principal..."

python3 << 'PYEOF'
import os

fp = 'src/app/dashboard/finance/page.tsx'
if os.path.exists(fp):
    with open(fp, 'r') as f:
        content = f.read()
    
    # Check if nav links already exist
    if '/dashboard/finance/pending' not in content:
        # Find a good place to add navigation — look for the header section
        # Add quick navigation links after the header
        nav_links = '''
        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <a href="/dashboard/finance/pending" 
             className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all group">
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <Clock size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pendentes / 入金待ち</p>
              <p className="text-xs text-gray-400">Pagamentos aguardando confirmação</p>
            </div>
          </a>
          <a href="/dashboard/finance/invoices"
             className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all group">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Faturas PJ / 請求書</p>
              <p className="text-xs text-gray-400">Gerenciar faturas corporativas</p>
            </div>
          </a>
          <a href="/dashboard/finance/reports"
             className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Relatórios / レポート</p>
              <p className="text-xs text-gray-400">Análise financeira por período</p>
            </div>
          </a>
        </div>'''
        
        # Try to insert after the header div (after mb-6 of the header)
        # Look for the refresh button area end
        if 'Atualizar' in content and 'fetchAll' in content:
            # Find the closing of the header section
            idx = content.find('</button>\n        </div>')
            if idx > -1:
                # Find the next line after closing div
                end_of_header = content.find('\n', idx + len('</button>\n        </div>'))
                if end_of_header > -1:
                    content = content[:end_of_header] + '\n' + nav_links + content[end_of_header:]
                    
                    # Make sure Clock, FileText, BarChart3 are imported
                    if 'Clock' not in content.split('from \'lucide-react\'')[0]:
                        content = content.replace(
                            'from \'lucide-react\';',
                            ', Clock, FileText, BarChart3 } from \'lucide-react\';',
                            1
                        )
                    
                    with open(fp, 'w') as f:
                        f.write(content)
                    print("  ✅ Links de navegação adicionados à página principal")
                else:
                    print("  ⚠ Não encontrou ponto de inserção exato — adicione manualmente")
            else:
                print("  ⚠ Estrutura diferente do esperado — adicione links manualmente")
        else:
            print("  ⚠ Página finance principal tem estrutura diferente — adicione links manualmente")
    else:
        print("  ⚠ Links já existem na página principal")
else:
    print("  ⚠ Página finance principal não encontrada")

PYEOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 CHECKLIST para completar a instalação:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Copie os 3 arquivos de página para as pastas corretas"
echo "2. Rode: cd $ADMIN_DIR && npx next build 2>&1 | tail -10"
echo "3. Se build OK: pm2 restart realpan-admin"
echo ""
echo "📁 Estrutura final:"
echo "  src/app/dashboard/finance/"
echo "  ├── page.tsx          (dashboard principal — já existe)"
echo "  ├── pending/"
echo "  │   └── page.tsx      (pagamentos pendentes)"
echo "  ├── invoices/"
echo "  │   └── page.tsx      (faturas PJ)"
echo "  └── reports/"
echo "      └── page.tsx      (relatórios financeiros)"
echo ""
echo "💰 Setup completo!"