import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const api = new WooCommerceRestApi({
  url: process.env.REACT_APP_WC_URL,
  consumerKey: process.env.REACT_APP_WC_KEY,
  consumerSecret: process.env.REACT_APP_WC_SECRET,
  version: "wc/v3",
  queryStringAuth: true,
});

export default api;