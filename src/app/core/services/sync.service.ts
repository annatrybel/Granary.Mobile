import { Injectable, inject, effect } from '@angular/core';
import { NetworkService } from './network.service';
import { AppDatabase } from '../db/app-database';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private network = inject(NetworkService);
  private db = inject(AppDatabase);

  constructor() {
    effect(() => {
      if (this.network.isOnline()) {
        console.log('🌐 Sieć powróciła! Rozpoczynam synchronizację...');
        this.processSyncQueue();
      }
    });
  }

  private async processSyncQueue(): Promise<void> {
    const tasks = await this.db.syncQueue.toArray();
    if (tasks.length === 0) return;

    for (const task of tasks) {
      try {
        if (task.id) {
          await this.db.syncQueue.delete(task.id);
        }
      } catch (error) {
        console.error('Błąd synchronizacji zadania:', task, error);
        break; 
      }
    }
  }
}