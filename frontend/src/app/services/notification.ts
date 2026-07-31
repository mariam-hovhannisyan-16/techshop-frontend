import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { Auth } from './auth';
import { SoundService } from './sound';

export interface NotificationResponse {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const CLEARED_IDS_KEY_PREFIX = 'notifications_cleared_';
const LOCAL_NOTIFICATIONS_KEY_PREFIX = 'notifications_local_';
const POLL_INTERVAL_MS = 20000;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8085/api/notifications';

  private readonly notifications = signal<NotificationResponse[]>([]);
  readonly items = this.notifications.asReadonly();
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  private knownIds = new Set<number>();
  private hasLoadedOnce = false;
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private soundService: SoundService
  ) {
    if (this.authService.getToken()) {
      this.refresh();
      this.startPolling();
    }
  }

  onLogin(): void {
    this.refresh();
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollHandle) return;
    this.pollHandle = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private readClearedIds(userId: number): Set<number> {
    try {
      const raw = localStorage.getItem(`${CLEARED_IDS_KEY_PREFIX}${userId}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  private addClearedIds(userId: number, ids: number[]): void {
    const cleared = this.readClearedIds(userId);
    ids.forEach(id => cleared.add(id));
    localStorage.setItem(`${CLEARED_IDS_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(cleared)));
  }

  private readLocalNotifications(userId: number): NotificationResponse[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_NOTIFICATIONS_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeLocalNotifications(userId: number, list: NotificationResponse[]): void {
    localStorage.setItem(`${LOCAL_NOTIFICATIONS_KEY_PREFIX}${userId}`, JSON.stringify(list));
  }

  private mergeWithLocal(userId: number, response: ApiResponse<NotificationResponse[]>): ApiResponse<NotificationResponse[]> {
    const cleared = this.readClearedIds(userId);
    const remote = response.data.filter(n => !cleared.has(n.id));
    const local = this.readLocalNotifications(userId).filter(n => !cleared.has(n.id));
    if (local.length === 0) return { ...response, data: remote };
    return { ...response, data: [...local, ...remote] };
  }

  addWelcomeNotification(userId: number, name: string): void {
    const notification: NotificationResponse = {
      id: -Date.now(),
      userId,
      message: `Welcome to TechShopArmenia, ${name}!`,
      read: false,
      createdAt: null
    };
    this.writeLocalNotifications(userId, [notification, ...this.readLocalNotifications(userId)]);
    this.notifications.update(list => [notification, ...list]);
    this.knownIds.add(notification.id);
    this.soundService.playNotification();
  }

  refresh(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.getNotifications(userId).subscribe({ error: () => {} });
  }

  clearLocalState(): void {
    this.notifications.set([]);
    this.knownIds = new Set();
    this.hasLoadedOnce = false;
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private detectNewArrivals(data: NotificationResponse[]): void {
    if (this.hasLoadedOnce) {
      const hasNewArrival = data.some(n => !this.knownIds.has(n.id));
      if (hasNewArrival) {
        this.soundService.playNotification();
      }
    }
    this.hasLoadedOnce = true;
    this.knownIds = new Set(data.map(n => n.id));
  }

  getNotifications(userId: number): Observable<ApiResponse<NotificationResponse[]>> {
    return this.http.get<ApiResponse<NotificationResponse[]>>(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() }).pipe(
      map(response => this.mergeWithLocal(userId, response)),
      tap(response => {
        this.detectNewArrivals(response.data);
        this.notifications.set(response.data);
      }),
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Notifications] Backend unreachable at ${this.apiUrl} — showing no notifications for development.`);
          return of(this.mergeWithLocal(userId, { success: true, message: 'mock', data: [] as NotificationResponse[] }));
        }
        return throwError(() => err);
      })
    );
  }

  markAsRead(notificationId: number): Observable<ApiResponse<null>> {
    if (notificationId < 0) {
      const userId = this.authService.getUserId();
      if (userId) {
        const updated = this.readLocalNotifications(userId).map(n => n.id === notificationId ? { ...n, read: true } : n);
        this.writeLocalNotifications(userId, updated);
      }
      this.notifications.update(list => list.map(n => n.id === notificationId ? { ...n, read: true } : n));
      return of({ success: true, message: 'mock', data: null });
    }

    return this.http.patch<ApiResponse<null>>(`${this.apiUrl}/${notificationId}/read`, {}, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.notifications.update(list => list.map(n => n.id === notificationId ? { ...n, read: true } : n));
      })
    );
  }

  clearAll(userId: number): void {
    const currentIds = this.notifications().map(n => n.id);
    if (currentIds.length === 0) return;
    this.addClearedIds(userId, currentIds.filter(id => id > 0));
    localStorage.removeItem(`${LOCAL_NOTIFICATIONS_KEY_PREFIX}${userId}`);
    this.notifications.set([]);
  }
}
