import { Component } from '@angular/core';
import { MenuComponent } from '../../features/menu/menu.component';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MenuComponent, MatIconModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  condition = true;

  constructor(
    private location: Location,
    private router: Router) {}

  goBack(): void {
    this.location.back();
  }

  get isConfigurationRoute(): boolean {
    return this.router.url === '/configuration';
  }
}
