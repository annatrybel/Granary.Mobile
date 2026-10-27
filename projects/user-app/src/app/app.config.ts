import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
  isDevMode,
  importProvidersFrom
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from '@granary/shared';
import { SyncService } from './core/services/sync.service';

import {
  LucideAngularModule,
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Image,
  Info,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Link2,
  ListOrdered,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Minus,
  MinusCircle,
  Moon,
  MoreVertical,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  PlusCircle,
  Refrigerator,
  Ruler,
  Search,
  Send,
  Share2,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Star,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  UserPlus,
  Users,
  Utensils,
  X,
  XCircle
} from 'lucide-angular';

const APP_ICONS = {
  AlertCircle, ArrowLeft, Bell, BookOpen, Camera, Check, CheckCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Copy, Eye, EyeOff, Flame, Globe, Heart, HelpCircle, Home, Image, Info, KeyRound, Laptop,
  LayoutDashboard, Link2, ListOrdered, Lock, LogIn, LogOut, Mail, Minus, MinusCircle, Moon, MoreVertical,
  Package, PanelLeftClose, PanelLeftOpen, Pencil, Plus, PlusCircle, Refrigerator, Ruler, Search, Send, Share2,
  ShoppingBasket, SlidersHorizontal, Sparkles, Sprout, Star, Sun, ThumbsDown, ThumbsUp, Trash2, User,
  UserPlus, Users, Utensils, X, XCircle
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Uruchamia synchronizację zmian zapisanych offline od startu aplikacji.
    provideAppInitializer(() => {
      inject(SyncService);
    }),
    importProvidersFrom(LucideAngularModule.pick(APP_ICONS))
  ],
};
