import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Panel Administracyjny</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Zarządzanie katalogiem produktów, moderacja i status AI.</p>
      </div>

      <!-- Karty statystyk (Kafelki podglądowe) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Katalog</span>
          <div class="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">Globalny</div>
          <p class="mt-1 text-xs text-slate-500">Zarządzaj słownikiem EAN i jednostkami</p>
        </div>

        <div class="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Groq AI</span>
          <div class="mt-2 text-3xl font-extrabold text-emerald-500">Gotowy</div>
          <p class="mt-1 text-xs text-slate-500">Kolejka tłumaczeń i promptów FLUX</p>
        </div>

        <div class="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Baza Danych</span>
          <div class="mt-2 text-3xl font-extrabold text-indigo-500">PostgreSQL</div>
          <p class="mt-1 text-xs text-slate-500">Połączenie EF Core aktywne</p>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent {}