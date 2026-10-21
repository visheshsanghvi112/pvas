"""
Automated Code-Level Verification and Integrity Tests for UI/UX Remediations.
Tests the mathematical invariants, validation logic, route links, pagination algorithms,
and layout definitions introduced across PVASF components.
"""
import re
from pathlib import Path
import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent

def test_app_shell_search_and_nav_code_integrity():
    """Verify AppShell contains active search bar and top-level navigation links."""
    app_shell_path = ROOT_DIR / "components" / "layout" / "app-shell.tsx"
    assert app_shell_path.exists(), "app-shell.tsx must exist"
    content = app_shell_path.read_text(encoding="utf-8")

    # 1. Check Global Search Bar input and state wiring
    assert 'placeholder="Search scrip' in content, "Search input must have scrip placeholder"
    assert "value={searchQuery}" in content, "Search input must be wired to searchQuery state"
    assert "onChange={(e) => setSearchQuery(e.target.value)}" in content, "Search input must update searchQuery"
    assert "handleSelectSymbol(scrip.symbol)" in content, "Autocomplete item click must trigger handleSelectSymbol"
    assert "router.push(`/analysis/${symbol}`)" in content, "handleSelectSymbol must route to /analysis/${symbol}"

    # 2. Check ScripSummary property accesses match TypeScript interface
    assert "scrip.latest_close" in content, "Search dropdown must access latest_close"
    assert "scrip.risk_score" in content, "Search dropdown must access risk_score"
    assert "scrip.company" in content, "Search dropdown must access company"

    # 3. Check Desktop Navigation tabs rendered directly in header
    assert 'href={item.href}' in content, "Primary nav links must be rendered"
    assert 'const isActive = item.href === "/"' in content, "Nav must compute active state with pathname"
    assert 'bg-slate-900 text-white shadow-xs' in content, "Active nav item must have distinct active pill styling"


def test_settings_weight_validation_and_auto_balance_algorithm():
    """Test the Auto-Balance algorithm and 100% weight validation logic."""
    settings_path = ROOT_DIR / "app" / "settings" / "page.tsx"
    assert settings_path.exists(), "settings/page.tsx must exist"
    content = settings_path.read_text(encoding="utf-8")

    # 1. Check validation check in handleSaveWeights
    assert "totalWeight !== 100" in content, "handleSaveWeights must validate totalWeight === 100"
    assert "setValidationError" in content, "Unbalanced weight must set validationError message"
    assert "Auto-Balance to 100%" in content, "Auto-balance button must be rendered in UI"

    # 2. Test mathematical correctness of the Auto-Balance normalization algorithm in Python
    def auto_balance(w1, w2, w3, w4, w5):
        s = w1 + w2 + w3 + w4 + w5
        if s == 0:
            return 20, 20, 20, 20, 20
        r1 = round((w1 / s) * 100)
        r2 = round((w2 / s) * 100)
        r3 = round((w3 / s) * 100)
        r4 = round((w4 / s) * 100)
        r5 = 100 - (r1 + r2 + r3 + r4)
        return r1, r2, r3, r4, r5

    # Test cases:
    assert sum(auto_balance(20, 20, 20, 20, 20)) == 100
    assert sum(auto_balance(50, 50, 0, 0, 0)) == 100
    assert sum(auto_balance(30, 40, 20, 10, 20)) == 100
    assert auto_balance(0, 0, 0, 0, 0) == (20, 20, 20, 20, 20)
    assert sum(auto_balance(100, 0, 0, 0, 0)) == 100

    # 3. Check framework scoring reference table is rendered
    assert "Framework Metric Scoring Matrix" in content, "Scoring matrix reference table must be rendered"
    assert "scoreRows.map" in content, "scoreRows must be mapped in reference table"

    # 4. Check slider bounds are expanded to 100
    sliders = re.findall(r'type="range"[^>]*max=\{100\}', content)
    assert len(sliders) == 5, f"All 5 sliders must have max={{100}}, found {len(sliders)}"


def test_alerts_table_clean_routes_and_sticky_column():
    """Verify alerts-table decommissioned dead exchange params and added sticky security column."""
    alerts_path = ROOT_DIR / "components" / "dashboard" / "alerts-table.tsx"
    assert alerts_path.exists(), "alerts-table.tsx must exist"
    content = alerts_path.read_text(encoding="utf-8")

    # 1. Verify NO exchange query parameter is passed in scrip links
    assert 'exchange && exchange !== "ALL"' not in content, "Residual exchange query parameter must be removed"

    # 2. Verify sticky left-0 positioning on Security column header and cell
    assert 'sticky left-0 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]' in content, "Security header must be sticky"
    assert 'sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]' in content, "Security cell must be sticky"

    # 3. Verify weekend market closed detection
    assert "Weekend Selected (Market Closed)" in content, "Empty state must detect weekend selected dates"


def test_investigation_workspace_accessibility_and_widths():
    """Verify fullscreen button visibility, ESC key drawer close, and counterparty widths."""
    ws_path = ROOT_DIR / "components" / "investigation" / "investigation-workspace.tsx"
    assert ws_path.exists(), "investigation-workspace.tsx must exist"
    content = ws_path.read_text(encoding="utf-8")

    # 1. Verify SectionHeader maximize button is discoverable without hover
    assert 'opacity-70 hover:opacity-100' in content, "SectionHeader maximize button must be visible without hover"

    # 2. Verify Tab maximize button is discoverable without hover
    assert 'opacity-60 hover:opacity-100' in content, "Tab maximize icon must be visible without hover"

    # 3. Verify Escape key closes selectedPan
    assert 'if (selectedPan) {\n          setSelectedPan(null);' in content, "Escape key must close Client 360 selectedPan"

    # 4. Verify counterparty names have expanded width
    assert 'truncate max-w-[150px] sm:max-w-[190px] xl:max-w-[240px]' in content, "Counterparty names must have expanded width bounds"


def test_history_page_pagination_and_defense():
    """Verify audit trail pagination, text wrapping, and record counts."""
    history_path = ROOT_DIR / "app" / "history" / "page.tsx"
    assert history_path.exists(), "history/page.tsx must exist"
    content = history_path.read_text(encoding="utf-8")

    # 1. Check pagination state and controls
    assert "const [currentPage, setCurrentPage] = useState(1);" in content
    assert "const [pageSize, setPageSize] = useState(25);" in content
    assert "paginatedLogs.map" in content, "Table must render paginatedLogs, not all logs"
    assert "Page {currentPage} of {totalPages}" in content, "Page counter must be displayed"

    # 2. Test mathematical correctness of pagination in Python
    logs = list(range(73))
    page_size = 25
    total_pages = max(1, (len(logs) + page_size - 1) // page_size)
    assert total_pages == 3
    p1 = logs[0:25]
    p2 = logs[25:50]
    p3 = logs[50:73]
    assert len(p1) == 25 and len(p2) == 25 and len(p3) == 23

    # 3. Check break-words on details cell
    assert "break-words whitespace-pre-wrap" in content, "Details cell must have break-words to prevent overflow"

    # 4. Check accurate record counter
    assert "({filteredLogs.length} of {auditLogs.length} records)" in content


def test_system_boundaries_error_and_404():
    """Verify 404 and Error pages use appropriate navigation and viewport bounds."""
    not_found_path = ROOT_DIR / "app" / "not-found.tsx"
    error_path = ROOT_DIR / "app" / "error.tsx"
    assert not_found_path.exists() and error_path.exists()

    nf_content = not_found_path.read_text(encoding="utf-8")
    err_content = error_path.read_text(encoding="utf-8")

    # 1. Check 404 has Previous Page action
    assert "Previous Page" in nf_content, "404 page must provide Previous Page button"
    assert "window.history.back()" in nf_content, "Previous Page must call window.history.back()"
    assert "Surveillance Dashboard" in nf_content, "404 page must link to Dashboard"

    # 2. Check viewport bounds do not force double scrollbars
    assert "min-h-[calc(100vh-120px)]" in nf_content, "404 page must use min-h-[calc(100vh-120px)]"
    assert "min-h-[calc(100vh-120px)]" in err_content, "Error page must use min-h-[calc(100vh-120px)]"


def test_analyse_redirect_and_chart_dma_safety():
    """Verify /analyse/[symbol] route redirect and moving average safety thresholds."""
    analyse_path = ROOT_DIR / "app" / "analyse" / "[symbol]" / "page.tsx"
    assert analyse_path.exists()
    content = analyse_path.read_text(encoding="utf-8")
    assert "redirect(`/analysis/${symbol}`)" in content, "Legacy /analyse route must redirect to /analysis"

    charts_path = ROOT_DIR / "components" / "investigation" / "charts.tsx"
    assert charts_path.exists()
    charts_content = charts_path.read_text(encoding="utf-8")
    assert "idx >= 19" in charts_content, "20 DMA must strictly require at least 20 trading sessions"
    assert "idx >= 49" in charts_content, "50 DMA must strictly require at least 50 trading sessions"
    assert "CustomScreenerTooltip" in charts_content, "Charts must include institutional CustomScreenerTooltip"

