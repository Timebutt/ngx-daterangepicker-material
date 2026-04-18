import { Component } from '@angular/core';

const singleDatepickerExample = require('!!raw-loader!../examples/single-datepicker-example.component.ts').default;

@Component({
    selector: 'single-datepicker',
    templateUrl: './single-datepicker.component.html',
    styleUrls: ['./single-datepicker.component.scss'],
    standalone: false,
})
export class SingleDatepickerComponent {
    singleDatepickerExample = singleDatepickerExample;
}
