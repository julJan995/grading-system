import { Component } from '@angular/core';
import { AvatarComponent } from '../../features/avatar/avatar.component';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-menu-sidebar',
  imports: [
    AvatarComponent,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './menu-sidebar.component.html',
  styleUrl: './menu-sidebar.component.scss'
})
export class MenuSidebarComponent {

}
