import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { OrderTracking } from './order-tracking';

describe('OrderTracking', () => {
  let component: OrderTracking;
  let fixture: ComponentFixture<OrderTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderTracking],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderTracking);
    component = fixture.componentInstance;
    component.status = 'new';
    component.createdAt = new Date().toISOString();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
