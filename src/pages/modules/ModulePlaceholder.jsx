export default function ModulePlaceholder({ title, description, buttonText }) {
  return (
    <div>
      <section className="page-header">
        <div>
          <span>Módulo</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <button className="primary-btn">{buttonText}</button>
      </section>

      <section className="empty-state">
        <div className="empty-icon">+</div>
        <h3>{title} todavía no tiene registros</h3>
        <p>
          Aquí construiremos el listado, formulario de creación, edición,
          impresión y descarga en PDF.
        </p>
      </section>
    </div>
  );
}