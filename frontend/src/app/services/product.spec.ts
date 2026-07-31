import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { Product } from './product';

describe('Product', () => {
  let service: Product;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    service = TestBed.inject(Product);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
