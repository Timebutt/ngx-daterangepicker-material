import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { Component, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { StyleManager } from '../style-manager';
import { ThemePickerModule } from '../theme-picker/theme-picker';
import { ThemeStorage } from '../theme-picker/theme-storage/theme-storage';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.html',
    styleUrls: ['./navbar.scss'],
    standalone: false,
})
export class NavBar {}

@NgModule({
    exports: [NavBar],
    declarations: [NavBar],
    imports: [CommonModule, MatButtonModule, MatMenuModule, RouterModule, ThemePickerModule],
    providers: [StyleManager, ThemeStorage, provideHttpClient(withInterceptorsFromDi())],
})
export class NavBarModule {}
