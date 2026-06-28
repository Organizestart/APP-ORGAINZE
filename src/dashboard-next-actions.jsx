export function DashboardNextSteps({ eyebrow, title, detail, tone = "good", items = [] }) {
  return (
    <section className={`dashboard-action-path ${tone}`} aria-label={title || "Dashboard action path"}>
      <div className="dashboard-action-path-summary">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <span>{detail}</span>
      </div>
      <div className="dashboard-action-path-items">
        {items.map(({ id, icon: Icon, label, detail: itemDetail, status, tone: itemTone = "good", target, onClick }) => (
          <button
            className={`dashboard-action-path-item ${itemTone}`}
            type="button"
            key={id || label}
            onClick={onClick}
            {...(target ? { "data-home-target": target } : {})}
          >
            {Icon && <Icon size={18} weight="fill" />}
            <span>
              <strong>{label}</strong>
              <small>{itemDetail}</small>
            </span>
            <em>{status}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
