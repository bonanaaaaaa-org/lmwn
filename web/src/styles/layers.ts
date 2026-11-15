/**
 * The cascade layers, lowest first. `globals.css` declares the same order on its first line;
 * the document head declares it again before any stylesheet, because the production build
 * bundles all CSS into one file whose first rule may come from a component (and a layer's
 * rank is set where it first appears). A unit test keeps the two in sync.
 */
export const CSS_LAYER_ORDER =
  "@layer reset, base, components, layout, features;";
