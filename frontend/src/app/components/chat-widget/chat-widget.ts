import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
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
    this.chatService.startConversation().subscribe({
      next: (response) => {
        this.conversationId = response.data.id;
        this.lastSeenId = this.readLastSeenId();
        this.loadMessages();
        this.startPolling();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadMessages(): void {
    if (this.conversationId === null) return;

    this.loading = this.messages.length === 0;
    this.chatService.getMessages(this.conversationId).subscribe({
      next: (response) => {
        this.messages = response.data;
        this.loading = false;

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
      error: () => {
        this.loading = false;
      }
    });
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
    if (!text || this.conversationId === null || this.sending) return;

    const conversationId = this.conversationId;
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
    this.sending = true;
    this.scrollToBottom();

    this.chatService.sendMessage(conversationId, text).subscribe({
      next: (response) => {
        const sent = this.messages.map(m => m === optimistic ? response.data.message : m);
        this.messages = response.data.botReply ? [...sent, response.data.botReply] : sent;
        this.sending = false;
        this.markAllSeen();
        if (response.data.botReply) this.scrollToBottom();
      },

      error: () => {
        this.sending = false;
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
