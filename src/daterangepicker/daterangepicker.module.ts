import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DaterangepickerComponent } from './daterangepicker.component';
import { DaterangepickerDirective } from './daterangepicker.directive';

@NgModule({
    declarations: [DaterangepickerComponent, DaterangepickerDirective],
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatSelectModule, OverlayModule],
    exports: [DaterangepickerComponent, DaterangepickerDirective],
})
export class NgxDaterangepickerMd {}
