import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  ImagePlus,
  Package,
  RefreshCcw,
  Search,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { isDominicanTenant } from "../../utils/taxConfig";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import "../../styles/product-catalog.css";

export default function ProductCatalog() {
  const { tenant, language } = useAuth();
  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
  const dictionary = language === "en" ? en : es;

  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const t = (path, fallback = "", vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
  };

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }),
    [locale, currency]
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const [settingsRes, productsRes] = await Promise.all([
        api.get("/catalog/settings"),
        api.get("/products?status=active&type=product"),
      ]);

      setSettings(settingsRes.data);
      setProducts(
        Array.isArray(productsRes.data)
          ? productsRes.data
          : productsRes.data?.data || []
      );
    } catch (error) {
      console.log(error);
      alert(t("productCatalog.alerts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const catalogProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      if (product.showInCatalog === false) return false;
      if (!term) return true;

      return (
        product.name?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const generateLink = async () => {
    try {
      setGenerating(true);
      const { data } = await api.post("/catalog/generate-link");
      setSettings(data);
    } catch (error) {
      console.log(error);
      alert(t("productCatalog.alerts.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!settings?.catalogUrl) return;
    await navigator.clipboard.writeText(settings.catalogUrl);
    alert(t("productCatalog.alerts.copied"));
  };

  return (
    <div className="catalog-admin-page">
      <section className="catalog-admin-hero">
        <div>
          <span>{t("productCatalog.title")}</span>
          <h2>{t("productCatalog.subtitle")}</h2>
          <p>{t("productCatalog.description")}</p>
        </div>

        <div className="catalog-link-card">
          <label>{t("productCatalog.linkLabel")}</label>

          <div className="catalog-link-box">
            <input
              value={
                settings?.catalogUrl ||
                t("productCatalog.generatePlaceholder")
              }
              readOnly
            />
            <button
              type="button"
              onClick={copyLink}
              disabled={!settings?.catalogUrl}
            >
              <Copy size={17} />
            </button>
          </div>

          <div className="catalog-link-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={generateLink}
              disabled={generating}
            >
              <RefreshCcw size={17} />
              {settings?.catalogUrl
                ? t("productCatalog.regenerate")
                : generating
                ? t("productCatalog.generating")
                : t("productCatalog.generate")}
            </button>

            {settings?.catalogUrl && (
              <a
                href={settings.catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-btn"
              >
                <ExternalLink size={17} />
                {t("productCatalog.viewCatalog")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="catalog-admin-panel">
        <div className="catalog-admin-toolbar">
          <div>
            <h3>{t("productCatalog.preview")}</h3>
            <p>
              {t("productCatalog.visibleProducts", "", {
                count: catalogProducts.length,
              })}
            </p>
          </div>

          <div className="catalog-search">
            <Search size={18} />
            <input
              placeholder={t("productCatalog.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="catalog-empty">{t("productCatalog.loading")}</div>
        ) : catalogProducts.length === 0 ? (
          <div className="catalog-empty">{t("productCatalog.empty")}</div>
        ) : (
          <div className="catalog-admin-grid">
            {catalogProducts.map((product) => (
              <article className="catalog-admin-card" key={product.id}>
                <div className="catalog-admin-image">
                  {product.imageDataUrl ? (
                    <img src={product.imageDataUrl} alt={product.name} />
                  ) : (
                    <ImagePlus size={32} />
                  )}
                </div>

                <div>
                  <span>
                    {product.category || t("productCatalog.defaultCategory")}
                  </span>
                  <h4>{product.name}</h4>
                  <strong>{money.format(Number(product.salePrice || 0))}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="catalog-note">
        <Package size={19} />
        <p>{t("productCatalog.note")}</p>
      </section>
    </div>
  );
}