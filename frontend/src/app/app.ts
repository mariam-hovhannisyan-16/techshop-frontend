import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme';
import { Footer } from './components/footer/footer';
import { AuthDrawer } from './components/auth-drawer/auth-drawer';
import { ChatWidget } from './components/chat-widget/chat-widget';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, AuthDrawer, ChatWidget],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor() {
    inject(ThemeService);
  }
}

