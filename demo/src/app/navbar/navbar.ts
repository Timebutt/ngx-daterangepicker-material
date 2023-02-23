import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { RouterModule } from '@angular/router';
import { StyleManager } from '../style-manager';
import { ThemePickerModule } from '../theme-picker/theme-picker';
import { ThemeStorage } from '../theme-picker/theme-storage/theme-storage';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.html',
    styleUrls: ['./navbar.scss'],
})
export class NavBar {}

@NgModule({
    imports: [CommonModule, HttpClientModule, MatButtonModule, MatMenuModule, RouterModule, ThemePickerModule],
    exports: [NavBar],
    declarations: [NavBar],
    providers: [StyleManager, ThemeStorage],
})
export class NavBarModule {}
