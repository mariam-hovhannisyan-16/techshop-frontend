import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';

export interface Review {
  id: number;
  productId: number;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const MOCK_REVIEWS: Review[] = [
  { id: 1, productId: 1, author: 'Արամ Ա.', rating: 5, comment: 'Հիանալի հեռախոս, արագ առաքում։', createdAt: '2026-06-02T10:00:00Z' },
  { id: 2, productId: 1, author: 'Նարինե Հ.', rating: 4, comment: 'Լավ որակ, բայց մարտկոցը կարող էր ավելի երկար տևել։', createdAt: '2026-06-10T14:30:00Z' },
  { id: 3, productId: 1, author: 'Դավիթ Մ.', rating: 5, comment: 'Խորհուրդ եմ տալիս բոլորին։', createdAt: '2026-06-15T09:15:00Z' },
];

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  getReviews(productId: number): Observable<Review[]> {
    return of(MOCK_REVIEWS.filter(review => review.productId === productId)).pipe(delay(300));
  }

  getAverageRating(productId: number): Observable<number> {
    return this.getReviews(productId).pipe(
      map(reviews => reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0)
    );
  }
}
