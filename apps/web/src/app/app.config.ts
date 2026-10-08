import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth';

// Configuração da base URL da API de auth (ADR 0006).
// Em produção/local dev aponta para o auth-service na porta 3001.
const AUTH_API_BASE_URL = 'http://localhost:3001';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Base URL da API de auth — injetável via inject(AUTH_API_BASE_URL) se
    // algum serviço precisar fazer chamada direta (ex.: refresh token futuro).
    { provide: 'AUTH_API_BASE_URL', useValue: AUTH_API_BASE_URL },
  ],
};