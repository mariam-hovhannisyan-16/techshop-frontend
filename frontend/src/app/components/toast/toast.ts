import { Component } from '@angular/core';
import { ToastService } from '../../services/toast';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-toast',
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  constructor(public toastService: ToastService) {}
}
