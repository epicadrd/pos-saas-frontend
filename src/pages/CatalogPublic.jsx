import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Search } from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../api/axios";
import "../styles/product-catalog.css";

export default function CatalogPublic() {
  const { token } = useParams();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const money = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  });

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/catalog/public/${token}`);
        setBusiness(data.business);
        setProducts(data.products || []);
      } catch (error) {
        console.log(error);
        setError(error.response?.data?.message || "Catálogo no disponible");
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      product.name?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)
    );
  }, [products, search]);

  if (loading) return <div className="public-catalog-state">Cargando catálogo...</div>;
  if (error) return <div className="public-catalog-state">{error}</div>;

  return (
    <main className="public-catalog-page" style={{ "--catalog-accent": business?.primaryColor || "#111827" }}>
      <header className="public-catalog-header">
        <div className="public-catalog-brand">
          {business?.logoDataUrl ? (
            <img src={business.logoDataUrl} alt={business.businessName} />
          ) : (
            <div>{business?.businessName?.charAt(0) || "C"}</div>
          )}

          <section>
            <span>Catálogo</span>
            <h1>{business?.businessName || "Catálogo"}</h1>
            <p>{business?.address || "Productos disponibles"}</p>
          </section>
        </div>

        <div className="public-catalog-search">
          <Search size={18} />
          <input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {filteredProducts.length === 0 ? (
        <div className="catalog-empty">No hay productos para mostrar.</div>
      ) : (
        <section className="public-catalog-grid">
          {filteredProducts.map((product) => (
            <article className="public-product-card" key={product.id}>
              <div className="public-product-image">
                {product.imageDataUrl ? (
                  <img src={product.imageDataUrl} alt={product.name} />
                ) : (
                  <ImagePlus size={34} />
                )}
              </div>

              <div className="public-product-info">
                <span>{product.category || "Producto"}</span>
                <h2>{product.name}</h2>
                {product.description && <p>{product.description}</p>}
                <strong>{money.format(Number(product.salePrice || 0))}</strong>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}