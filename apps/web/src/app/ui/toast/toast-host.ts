// Host dos toasts (guia §5): renderiza a fila do `ToastService` acima da
// bottom nav. Só a apresentação vive aqui; tempo e descarte são do serviço.
// O contêiner existe sempre (região estável), mas sem `aria-live`: cada toast
// já traz `role="status"`/`role="alert"` e o anúncio duplicado é evitado.
import { Component, inject } from '@angular/core';
import { CloseIcon } from '../icons';
import { ToastService } from './toast';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-host',
  imports: [CloseIcon],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.scss',
})
export class ToastHost {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  protected runAction(toast: Toast): void {
    this.toastService.runAction(toast.id);
  }
}
