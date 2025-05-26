import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { GradingSystemConfigurationComponent } from './features/grading-system-configuration/grading-system-configuration.component';

export const routes: Routes = [
    {
        path: 'dashboard',
        component: DashboardComponent
    },
    {
        path: 'configuration',
        component: GradingSystemConfigurationComponent
    }, 
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    }
];