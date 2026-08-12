export const tenantHasFeatureOverride = (
  tenant,
  feature
) => {
  let features = tenant?.featureOverrides;

  if (typeof features === "string") {
    try {
      features = JSON.parse(features);
    } catch {
      features = [];
    }
  }

  if (!Array.isArray(features)) {
    features = [];
  }

  return features.includes(feature);
};