import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { ChatWidget } from './chat-widget';

describe('ChatWidget', () => {
  let component: ChatWidget;
  let fixture: ComponentFixture<ChatWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatWidget],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts closed with no unread badge', () => {
    fixture.detectChanges();
    expect(component.open).toBe(false);
    expect(component.hasUnread).toBe(false);
  });

  it('opens the panel on toggle', () => {
    fixture.detectChanges();
    component.toggle();
    expect(component.open).toBe(true);
  });
});
