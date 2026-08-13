import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, of, tap, map, shareReplay, finalize } from 'rxjs';
import { ChatService, MessageResponse } from '../../services/chat';
import { ChatWidgetService } from '../../services/chat-widget';
import { Icon } from '../icon/icon';

const POLL_INTERVAL_MS = 8000;
const LAST_SEEN_KEY_PREFIX = 'chat_last_seen_';

@Component({
  selector: 'app-chat-widget',
  imports: [CommonModule, FormsModule, TranslatePipe, Icon],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
})
export class ChatWidget implements OnInit, OnDestroy {
  open = false;
  loading = false;
  sending = false;
  hasUnread = false;
  draft = '';
  messages: MessageResponse[] = [];

  @ViewChild('messageList') private messageListRef?: ElementRef<HTMLDivElement>;

  private conversationId: number | null = null;
  private conversationReady: Observable<number> | null = null;
  private lastSeenId = 0;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private skipInitialOpenRequest = true;

  constructor(private chatService: ChatService, chatWidgetService: ChatWidgetService) {

    effect(() => {
      chatWidgetService.openRequests();
      if (this.skipInitialOpenRequest) {
        this.skipInitialOpenRequest = false;
        return;
      }
      this.openPanel();
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  ngOnInit(): void {
    const savedId = this.chatService.getSavedConversationId();
    if (savedId !== null) {
      this.conversationId = savedId;
      this.lastSeenId = this.readLastSeenId();
      this.loadMessages();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  toggle(): void {
    if (this.open) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  close(): void {
    this.open = false;
  }

  private openPanel(): void {
    this.open = true;
    this.hasUnread = false;

    if (this.conversationId === null) {
      this.initConversation();
    } else {
      this.loadMessages();
    }
  }

  private initConversation(): void {
    this.loading = true;
    this.ensureConversation().subscribe({
      next: () => this.loadMessages(),
      error: () => {
        this.loading = false;
      }
    });
  }

  // Shares one in-flight startConversation() call so openPanel()'s auto-init and send() can't race each other into creating two conversations.
  private ensureConversation(): Observable<number> {
    if (this.conversationId !== null) {
      return of(this.conversationId);
    }

    if (!this.conversationReady) {
      this.conversationReady = this.chatService.startConversation().pipe(
        tap(response => {
          this.conversationId = response.data.id;
          this.lastSeenId = this.readLastSeenId();
          this.startPolling();
        }),
        map(response => response.data.id),
        shareReplay(1),
        finalize(() => {
          this.conversationReady = null;
        })
      );
    }

    return this.conversationReady;
  }

  private loadMessages(): void {
    if (this.conversationId === null) return;
    const conversationId = this.conversationId;

    this.loading = this.messages.length === 0;
    this.chatService.getMessages(conversationId).subscribe({
      next: (response) => {
        this.loading = false;
        if (this.conversationId !== conversationId) return;

        this.messages = response.data;

        if (this.open) {
          this.markAllSeen();
          this.scrollToBottom();
          return;
        }

        const latestReplyId = this.messages
          .filter(m => m.sender === 'SUPPORT' || m.sender === 'BOT')
          .reduce((max, m) => Math.max(max, m.id), 0);
        if (latestReplyId > this.lastSeenId) {
          this.hasUnread = true;
        }
      },
      error: (err) => {
        this.loading = false;
        if (this.conversationId !== conversationId) return;

        if (this.isStaleConversation(err)) {
          this.resetConversation();
        }
      }
    });
  }

  private isStaleConversation(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 404;
  }

  private resetConversation(): void {
    this.stopPolling();
    this.chatService.clearSavedConversationId();
    this.conversationId = null;
    this.conversationReady = null;
    this.messages = [];
    this.lastSeenId = 0;
  }

  private markAllSeen(): void {
    const latestId = this.messages.reduce((max, m) => Math.max(max, m.id), 0);
    if (latestId > this.lastSeenId) {
      this.lastSeenId = latestId;
      this.writeLastSeenId(this.lastSeenId);
    }
    this.hasUnread = false;
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollHandle = setInterval(() => this.loadMessages(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending) return;

    this.sending = true;
    this.ensureConversation().subscribe({
      next: (conversationId) => this.postMessage(conversationId, text),
      error: () => {
        this.sending = false;
      }
    });
  }

  private postMessage(conversationId: number, text: string): void {
    const optimistic: MessageResponse = {
      id: -Date.now(),
      conversationId,
      sender: 'CUSTOMER',
      text,
      read: true,
      createdAt: new Date().toISOString()
    };
    this.messages = [...this.messages, optimistic];
    this.draft = '';
    this.scrollToBottom();

    this.chatService.sendMessage(conversationId, text).subscribe({
      next: (response) => {
        this.sending = false;
        if (this.conversationId !== conversationId) return;

        const sent = this.messages.map(m => m === optimistic ? response.data.message : m);
        this.messages = response.data.botReply ? [...sent, response.data.botReply] : sent;
        this.markAllSeen();
        if (response.data.botReply) this.scrollToBottom();
      },

      error: (err) => {
        this.sending = false;
        if (this.conversationId !== conversationId) return;

        if (this.isStaleConversation(err)) {
          this.messages = this.messages.filter(m => m !== optimistic);
          this.resetConversation();
        }
      }
    });
  }

  private lastSeenKey(): string {
    return `${LAST_SEEN_KEY_PREFIX}${this.conversationId}`;
  }

  private readLastSeenId(): number {
    const raw = localStorage.getItem(this.lastSeenKey());
    return raw ? Number(raw) : 0;
  }

  private writeLastSeenId(id: number): void {
    localStorage.setItem(this.lastSeenKey(), String(id));
  }
}
