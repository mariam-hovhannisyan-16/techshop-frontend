import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Product } from '../../services/product';
import { ReviewsService, Review } from '../../services/reviews';
import { AdminUserService } from '../../services/admin-user';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { StarRating } from '../../components/star-rating/star-rating';

export interface AdminReviewRow {
  id: number;
  reviewerName: string;
  productId: number;
  productName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-reviews',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, Toast, StarRating],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.scss',
})
export class AdminReviews implements OnInit {
  reviews: AdminReviewRow[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private productService: Product,
    private reviewsService: ReviewsService,
    private adminUserService: AdminUserService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      products: this.productService.getAllProducts(),
      users: this.adminUserService.getAllUsers()
    }).subscribe({
      next: ({ products, users }) => {
        const userNameById = new Map(users.data.map(u => [u.id, u.name]));
        const productNameById = new Map(products.data.map(p => [p.id, p.name]));
        const reviewRequests = products.data.map(p =>
          this.reviewsService.getReviews(p.id).pipe(catchError(() => of([] as Review[])))
        );

        forkJoin(reviewRequests).subscribe({
          next: (reviewLists) => {
            this.reviews = reviewLists
              .flat()
              .map(r => ({
                id: r.id,
                reviewerName: userNameById.get(r.userId) ?? `#${r.userId}`,
                productId: r.productId,
                productName: productNameById.get(r.productId) ?? `#${r.productId}`,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt
              }))
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorMessage = 'FAILED_TO_LOAD_REVIEWS';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_REVIEWS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/product', productId]).then();
  }
}
