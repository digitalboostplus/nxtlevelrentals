interface LandlordSummary {
    totalRentCollected: number;
    totalExpenses: number;
    netIncome: number;
    pendingPayouts: number;
    propertyCount: number;
    tenantCount: number;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

type LandlordDashboardHighlightsProps = {
    summary: LandlordSummary;
};

export default function LandlordDashboardHighlights({ summary }: LandlordDashboardHighlightsProps) {
    const stats = [
        {
            label: 'Total Rent Collected',
            value: formatCurrency(summary.totalRentCollected),
            meta: 'Current period'
        },
        {
            label: 'Net Income',
            value: formatCurrency(summary.netIncome),
            meta: `After ${formatCurrency(summary.totalExpenses)} expenses`
        },
        {
            label: 'Portfolio Status',
            value: `${summary.propertyCount} Properties`,
            meta: `${summary.tenantCount} Active tenants`
        },
        {
            label: 'Pending Payout',
            value: formatCurrency(summary.pendingPayouts),
            meta: 'Next scheduled transfer'
        }
    ];

    return (
        <section className="section">
            <div className="section__inner">
                <div className="card__header" style={{ marginBottom: '2rem' }}>
                    <h2 className="card__title">Financial Overview</h2>
                    <span className="tag tag--success">Next payout in 3 days</span>
                </div>
                <div className="stat-grid">
                    {stats.map((stat) => (
                        <div className="stat-card" key={stat.label}>
                            <div className="stat-card__label">{stat.label}</div>
                            <div className="stat-card__value">{stat.value}</div>
                            <div className="stat-card__meta">{stat.meta}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
