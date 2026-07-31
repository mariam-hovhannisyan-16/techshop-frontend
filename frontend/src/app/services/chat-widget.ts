import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChatWidgetService {
  readonly openRequests = signal(0);

  requestOpen(): void {
    this.openRequests.update(count => count + 1);
  }
}
