import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AdminChatService } from '../../services/admin-chat';
import { AdminUserService } from '../../services/admin-user';
import { ConversationResponse, MessageResponse } from '../../services/chat';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';

interface ConversationSummary {
  conversation: ConversationResponse;
  displayName: string;
  preview: string;
  unread: boolean;
  lastMessageId: number;
  lastMessageAt: string;
}

@Component({
  selector: 'app-admin-chat',
  imports: [CommonModule, FormsModule, TranslatePipe, AppHeader, Icon, Toast],
  templateUrl: './admin-chat.html',
  styleUrl: './admin-chat.scss',
})
export class AdminChat implements OnInit {
  conversations: ConversationSummary[] = [];
  loading = true;
  errorMessage = '';

  selected: ConversationSummary | null = null;
  messages: MessageResponse[] = [];
  threadLoading = false;
  replyDraft = '';
  sending = false;

  @ViewChild('messageList') private messageListRef?: ElementRef<HTMLDivElement>;

  constructor(
    private adminChatService: AdminChatService,
    private adminUserService: AdminUserService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.selected = null;

    forkJoin({
      conversations: this.adminChatService.getAllConversations(),
      users: this.adminUserService.getAllUsers()
    }).subscribe({
      next: ({ conversations, users }) => {
        const userMap = new Map(users.data.map(u => [u.id, u.name]));
        const list = conversations.data;

        if (list.length === 0) {
          this.conversations = [];
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        forkJoin(
          list.map(conv =>
            this.adminChatService.getMessages(conv.id).pipe(
              map(response => this.buildSummary(conv, response.data, userMap)),
              catchError(() => of(this.buildSummary(conv, [], userMap)))
            )
          )
        ).subscribe(summaries => {
          // Escalated (human-requested) conversations surface above
          // still-bot-handled ones regardless of recency, so an admin
          // scanning the list sees the ones waiting on a person first;
          // recency still breaks ties within each group.
          this.conversations = summaries.sort((a, b) =>
            Number(b.conversation.escalated) - Number(a.conversation.escalated)
            || b.lastMessageAt.localeCompare(a.lastMessageAt)
          );
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_CONVERSATIONS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildSummary(conv: ConversationResponse, messages: MessageResponse[], userMap: Map<number, string>): ConversationSummary {
    const last = messages[messages.length - 1];
    const lastMessageId = messages.reduce((max, m) => Math.max(max, m.id), 0);
    const lastSeen = this.adminChatService.getLastSeenId(conv.id);
    const lastCustomerMessage = [...messages].reverse().find(m => m.sender === 'CUSTOMER');

    return {
      conversation: conv,
      displayName: conv.userId != null
        ? (userMap.get(conv.userId) ?? `#${conv.userId}`)
        : `${this.translateService.instant('ADMIN_CHAT_GUEST')} ${(conv.guestSessionId ?? '').slice(0, 8)}`,
      preview: last ? last.text : '',
      unread: !!lastCustomerMessage && lastCustomerMessage.id > lastSeen,
      lastMessageId,
      lastMessageAt: last?.createdAt ?? conv.createdAt
    };
  }

  isSelected(summary: ConversationSummary): boolean {
    return this.selected?.conversation.id === summary.conversation.id;
  }

  openConversation(summary: ConversationSummary): void {
    this.selected = summary;
    this.threadLoading = true;
    this.messages = [];

    this.adminChatService.getMessages(summary.conversation.id).subscribe({
      next: (response) => {
        this.messages = response.data;
        this.threadLoading = false;
        const latestId = this.messages.reduce((max, m) => Math.max(max, m.id), summary.lastMessageId);
        this.adminChatService.markSeen(summary.conversation.id, latestId);
        summary.unread = false;
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: () => {
        this.threadLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeThread(): void {
    this.selected = null;
    this.messages = [];
  }

  sendReply(): void {
    const text = this.replyDraft.trim();
    if (!text || !this.selected || this.sending) return;

    const conversationId = this.selected.conversation.id;
    this.sending = true;
    this.adminChatService.sendReply(conversationId, text).subscribe({
      next: (response) => {
        this.messages = [...this.messages, response.data];
        this.replyDraft = '';
        this.sending = false;
        this.adminChatService.markSeen(conversationId, response.data.id);
        const item = this.conversations.find(c => c.conversation.id === conversationId);
        if (item) {
          item.preview = response.data.text;
          item.lastMessageAt = response.data.createdAt;
          item.lastMessageId = response.data.id;
        }
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: () => {
        this.sending = false;
        this.toastService.show(this.translateService.instant('ADMIN_CHAT_SEND_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
