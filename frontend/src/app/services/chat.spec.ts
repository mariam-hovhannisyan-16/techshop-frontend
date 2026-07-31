import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { ChatService } from './chat';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    service = TestBed.inject(ChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('has no saved conversation before one is started', () => {
    expect(service.getSavedConversationId()).toBeNull();
  });
});
