import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MenuSidebarComponent } from './components/menu-sidebar/menu-sidebar.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MenuSidebarComponent,
    HeaderComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'grading-system';
}
