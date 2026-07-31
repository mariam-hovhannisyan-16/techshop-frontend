import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  let component: AccountMenu;
  let fixture: ComponentFixture<AccountMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
