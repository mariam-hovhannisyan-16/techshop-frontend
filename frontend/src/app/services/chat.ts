import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';

export type MessageSender = 'CUSTOMER' | 'SUPPORT' | 'BOT';
export type ConversationStatus = 'OPEN' | 'CLOSED';

export interface MessageResponse {
  id: number;
  conversationId: number;
  sender: MessageSender;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface ConversationResponse {
  id: number;
  userId: number | null;
  guestSessionId: string | null;
  status: ConversationStatus;
  // Surfaced only in the admin panel (see admin-chat.ts/html) — customers
  // have no way to set this from the widget; the AI assistant always
  // handles their messages automatically.
  escalated: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const GUEST_SESSION_KEY = 'chat_guest_session_id';
const LOCAL_CHAT_KEY_PREFIX = 'local_chat_';
const CONVERSATION_ID_KEY_PREFIX = 'chat_conversation_id_';

interface LocalChatState {
  conversation: ConversationResponse;
  messages: MessageResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.chatApiUrl}/api/chat`;

  constructor(
    private http: HttpClient,
    private authService: Auth
  ) {}

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({ Authorization: `Bearer ${token}` });
    }

    return new HttpHeaders({ 'X-Guest-Session-Id': this.getGuestSessionId() });
  }

  private getGuestSessionId(): string {
    let id = localStorage.getItem(GUEST_SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_SESSION_KEY, id);
    }
    return id;
  }

  private localKey(): string {
    const userId = this.authService.getUserId();
    return `${LOCAL_CHAT_KEY_PREFIX}${userId ?? this.getGuestSessionId()}`;
  }

  private conversationIdKey(): string {
    const userId = this.authService.getUserId();
    return `${CONVERSATION_ID_KEY_PREFIX}${userId ?? this.getGuestSessionId()}`;
  }

  getSavedConversationId(): number | null {
    const raw = localStorage.getItem(this.conversationIdKey());
    return raw ? Number(raw) : null;
  }

  private saveConversationId(id: number): void {
    localStorage.setItem(this.conversationIdKey(), String(id));
  }

  private readLocalState(): LocalChatState | null {
    try {
      const raw = localStorage.getItem(this.localKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private writeLocalState(state: LocalChatState): void {
    localStorage.setItem(this.localKey(), JSON.stringify(state));
  }

  private getOrCreateLocalConversation(): ConversationResponse {
    const existing = this.readLocalState();
    if (existing) return existing.conversation;

    const userId = this.authService.getUserId();
    const conversation: ConversationResponse = {
      id: -Date.now(),
      userId,
      guestSessionId: userId ? null : this.getGuestSessionId(),
      status: 'OPEN',
      escalated: false,
      createdAt: new Date().toISOString()
    };
    this.writeLocalState({ conversation, messages: [] });
    return conversation;
  }

  startConversation(): Observable<ApiResponse<ConversationResponse>> {
    return this.http.post<ApiResponse<ConversationResponse>>(`${this.apiUrl}/conversations`, {}, { headers: this.getHeaders() }).pipe(
      tap(response => this.saveConversationId(response.data.id)),
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Chat] Backend unreachable at ${this.apiUrl} — using local conversation for development.`);
          const conversation = this.getOrCreateLocalConversation();
          this.saveConversationId(conversation.id);
          return of({ success: true, message: 'mock', data: conversation });
        }
        return throwError(() => err);
      })
    );
  }

  getMessages(conversationId: number): Observable<ApiResponse<MessageResponse[]>> {
    if (conversationId < 0) {
      const state = this.readLocalState();
      return of({ success: true, message: 'mock', data: state?.messages ?? [] });
    }

    return this.http.get<ApiResponse<MessageResponse[]>>(`${this.apiUrl}/conversations/${conversationId}/messages`, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (this.isUnreachable(err)) {
          const state = this.readLocalState();
          return of({ success: true, message: 'mock', data: state?.messages ?? [] });
        }
        return throwError(() => err);
      })
    );
  }

  sendMessage(conversationId: number, text: string): Observable<ApiResponse<MessageResponse>> {
    if (conversationId < 0) {
      return of(this.sendLocalMessage(conversationId, text));
    }

    return this.http.post<ApiResponse<MessageResponse>>(`${this.apiUrl}/conversations/${conversationId}/messages`, { text }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Chat] Backend unreachable at ${this.apiUrl} — using local conversation for development.`);
          return of(this.sendLocalMessage(conversationId, text));
        }
        return throwError(() => err);
      })
    );
  }

  private sendLocalMessage(conversationId: number, text: string): ApiResponse<MessageResponse> {
    const state = this.readLocalState() ?? { conversation: this.getOrCreateLocalConversation(), messages: [] };
    const message: MessageResponse = {
      id: Date.now(),
      conversationId,
      sender: 'CUSTOMER',
      text,
      read: true,
      createdAt: new Date().toISOString()
    };
    state.messages.push(message);
    this.writeLocalState(state);
    return { success: true, message: 'mock', data: message };
  }
}
