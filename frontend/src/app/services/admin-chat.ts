import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auth } from './auth';
import { ConversationResponse, MessageResponse } from './chat';
import { environment } from '../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const LAST_SEEN_KEY_PREFIX = 'admin_chat_last_seen_';

@Injectable({
  providedIn: 'root'
})
export class AdminChatService {
  private apiUrl = `${environment.chatApiUrl}/api/chat`;
  // Listing every conversation only ever made sense as an admin operation —
  // it used to also exist on the customer-facing ChatController as a
  // leftover duplicate, but that copy was removed in a backend cleanup, so
  // this now has to go through AdminChatController's own route instead.
  // Confirmed directly: GET /api/chat/conversations now 405s regardless of
  // role, while GET /api/admin/chat/conversations 200s for an admin JWT.
  // Per-conversation messages/reply below are unaffected by that cleanup —
  // confirmed directly they still work fine at the original /api/chat path
  // for an admin token, so only the list endpoint moved.
  private adminApiUrl = `${environment.chatApiUrl}/api/admin/chat`;

  constructor(private http: HttpClient, private authService: Auth) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getAllConversations(): Observable<ApiResponse<ConversationResponse[]>> {
    return this.http.get<ApiResponse<ConversationResponse[]>>(`${this.adminApiUrl}/conversations`, { headers: this.getHeaders() });
  }

  getMessages(conversationId: number): Observable<ApiResponse<MessageResponse[]>> {
    return this.http.get<ApiResponse<MessageResponse[]>>(`${this.apiUrl}/conversations/${conversationId}/messages`, { headers: this.getHeaders() });
  }

  sendReply(conversationId: number, text: string): Observable<ApiResponse<MessageResponse>> {
    return this.http.post<ApiResponse<MessageResponse>>(`${this.apiUrl}/conversations/${conversationId}/messages`, { text }, { headers: this.getHeaders() });
  }

  getLastSeenId(conversationId: number): number {
    const raw = localStorage.getItem(`${LAST_SEEN_KEY_PREFIX}${conversationId}`);
    return raw ? Number(raw) : 0;
  }

  markSeen(conversationId: number, latestMessageId: number): void {
    if (latestMessageId <= this.getLastSeenId(conversationId)) return;
    localStorage.setItem(`${LAST_SEEN_KEY_PREFIX}${conversationId}`, String(latestMessageId));
  }
}
