/** Product review (Modelo BD v2 §12: reviews), as returned by the backend. */
export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type Review = {
  id: string;
  productId: string;
  /** "Lucía Q." — never the full name or email. */
  authorName: string;
  rating: number;
  title: string;
  body: string;
  /** order_item_id present: bought and received in this store. */
  verifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulCount: number;
  createdAt: string;
  isMine: boolean;
};

export type ProductReviews = {
  /** Approved reviews, newest first (plus the viewer's own, any status). */
  reviews: Review[];
  mine: Review | null;
  /** Signed in and hasn't reviewed this product yet. */
  canReview: boolean;
  signedIn: boolean;
};

export type ReviewableProduct = {
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  orderNumber: string;
};
