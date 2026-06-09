const API_URL = 'http://localhost:8080/wp-json/wp/v2';

export async function fetchCategories() {
  const response = await fetch(`${API_URL}/product_cat`);
  const data = await response.json();
  return data.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
  }));
}
