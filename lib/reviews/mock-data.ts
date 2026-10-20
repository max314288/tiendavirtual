import type { Review } from "./types";

// Seed reviews for API_MODE=mock. The products' cached rating_avg /
// rating_count come from the catalog seed, as the backend caches them.

type Seed = [productId: string, author: string, rating: number, title: string, body: string, daysAgo: number, helpful: number];

const seeds: Seed[] = [
  ["p-aura-studio-anc-pro", "Diego R.", 5, "La cancelación de ruido es increíble", "Los uso en el bus y en la oficina. Aíslan muchísimo y la batería me dura toda la semana.", 6, 18],
  ["p-aura-studio-anc-pro", "Valeria M.", 5, "Cómodos por horas", "Las almohadillas no aprietan y el sonido es muy balanceado. La app permite ajustar el ecualizador.", 21, 9],
  ["p-aura-studio-anc-pro", "Jorge P.", 4, "Muy buenos, el estuche es grande", "Calidad de sonido excelente. Le resto una estrella porque el estuche ocupa bastante en la mochila.", 40, 4],
  ["p-titan-ultra-reloj", "Camila T.", 5, "Perfecto para correr", "El GPS es preciso y la pantalla se ve bien bajo el sol.", 12, 6],
  ["p-zapatillas-urbanas-blancas", "Andrea L.", 5, "Talla exacta", "Pedí mi talla de siempre y me quedaron perfectas. El cuero se siente de buena calidad.", 9, 3],
  ["p-mochila-commuter", "Luis F.", 4, "Resiste la lluvia", "La usé en temporada de lluvias y la laptop llegó seca. Me gustaría un bolsillo lateral más.", 15, 2],
  ["p-cafetera-pour-over", "Rosa C.", 5, "Café delicioso", "Fácil de limpiar y el filtro de acero funciona muy bien.", 30, 5],
];

const REFERENCE = Date.parse("2026-10-15T15:00:00Z");

export const seedReviews: Review[] = seeds.map(([productId, authorName, rating, title, body, daysAgo, helpfulCount], i) => ({
  id: `rv-seed-${i}`,
  productId,
  authorName,
  rating,
  title,
  body,
  verifiedPurchase: true,
  status: "approved",
  helpfulCount,
  createdAt: new Date(REFERENCE - daysAgo * 86_400_000).toISOString(),
  isMine: false,
}));
