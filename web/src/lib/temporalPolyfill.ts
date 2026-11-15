// Its own module, so the build names the polyfill's chunk `assets/temporalPolyfill-*.js`: the
// service worker keeps it out of the precache and caches it only for browsers that load it.
import "temporal-polyfill/global";
