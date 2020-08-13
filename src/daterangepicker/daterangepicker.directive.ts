import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
    ChangeDetectorRef,
    ComponentRef,
    Directive,
    ElementRef,
    EventEmitter,
    forwardRef,
    Input,
    KeyValueDiffers,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewContainerRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DaterangepickerComponent } from './daterangepicker.component';
import { LocaleConfig } from './daterangepicker.config';
import { LocaleService } from './locale.service';

@Directive({
    selector: 'input[ngxDaterangepickerMd]',
    host: {
        '(keyup.esc)': 'hide()',
        '(blur)': 'onBlur()',
        '(click)': 'open()',
        '(keyup)': 'inputChanged($event)',
        autocomplete: 'off',
    },
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DaterangepickerDirective),
            multi: true,
        },
    ],
})
export class DaterangepickerDirective implements OnInit, OnChanges, OnDestroy {
    private _onChange = Function.prototype;
    private _onTouched = Function.prototype;
    private _validatorChange = Function.prototype;
    private _value: any;
    private overlayRef: OverlayRef;
    private componentRef: ComponentRef<DaterangepickerComponent>;

    @Input()
    minDate: Date;
    @Input()
    maxDate: Date;
    @Input()
    autoApply: boolean;
    @Input()
    alwaysShowCalendars: boolean;
    @Input()
    showCustomRangeLabel: boolean;
    @Input()
    linkedCalendars: boolean;
    @Input()
    dateLimit: number = null;
    @Input()
    singleDatePicker: boolean;
    @Input()
    showWeekNumbers: boolean;
    @Input()
    showISOWeekNumbers: boolean;
    @Input()
    showDropdowns: boolean;
    @Input()
    showClearButton: boolean;
    @Input()
    customRangeDirection: boolean;
    @Input()
    ranges = {};
    @Input()
    opens: 'left' | 'center' | 'right' = 'center';
    @Input()
    drops: 'up' | 'down' = 'down';
    firstMonthDayClass: string;
    @Input()
    lastMonthDayClass: string;
    @Input()
    emptyWeekRowClass: string;
    @Input()
    firstDayOfNextMonthClass: string;
    @Input()
    lastDayOfPreviousMonthClass: string;
    @Input()
    keepCalendarOpeningWithRange: boolean;
    @Input()
    showRangeLabelOnInput: boolean;
    @Input()
    showCancel = false;
    @Input()
    lockStartDate = false;
    @Input()
    timePicker = false;
    @Input()
    timePicker24Hour = false;
    @Input()
    timePickerIncrement = 1;
    @Input()
    timePickerSeconds = false;
    @Input() closeOnAutoApply = true;
    _locale: LocaleConfig = {};
    @Input() set locale(value) {
        this._locale = { ...this._localeService.config, ...value };
    }
    get locale(): any {
        return this._locale;
    }
    @Input()
    private _endKey = 'endDate';
    private _startKey = 'startDate';
    @Input() set startKey(value) {
        if (value !== null) {
            this._startKey = value;
        } else {
            this._startKey = 'startDate';
        }
    }
    @Input() set endKey(value) {
        if (value !== null) {
            this._endKey = value;
        } else {
            this._endKey = 'endDate';
        }
    }
    notForChangesProperty: Array<string> = ['locale', 'endKey', 'startKey'];

    get value() {
        return this._value || null;
    }
    set value(val) {
        this._value = val;
        this._onChange(val);
        this._changeDetectorRef.markForCheck();
    }

    @Input()
    isInvalidDate = (date: Date) => false;
    @Input()
    isCustomDate = (date: Date) => false;
    @Input()
    isTooltipDate = (date: Date) => null;

    @Output('change') onChange: EventEmitter<{ startDate: Date; endDate: Date }> = new EventEmitter();
    @Output('rangeClicked') rangeClicked: EventEmitter<{ label: string; dates: [Date, Date] }> = new EventEmitter();
    @Output('datesUpdated') datesUpdated: EventEmitter<{ startDate: Date; endDate: Date }> = new EventEmitter();
    @Output() startDateChanged: EventEmitter<{ startDate: Date }> = new EventEmitter();
    @Output() endDateChanged: EventEmitter<{ endDate: Date }> = new EventEmitter();

    destroy$ = new Subject();

    constructor(
        public viewContainerRef: ViewContainerRef,
        public _changeDetectorRef: ChangeDetectorRef,
        private _el: ElementRef,
        private differs: KeyValueDiffers,
        private _localeService: LocaleService,
        private elementRef: ElementRef,
        private overlay: Overlay
    ) {}

    ngOnInit(): void {
        this._buildLocale();
    }

    ngOnChanges(changes: SimpleChanges): void {
        for (const change in changes) {
            if (changes.hasOwnProperty(change)) {
                if (this.componentRef && this.notForChangesProperty.indexOf(change) === -1) {
                    this.componentRef[change] = changes[change].currentValue;
                }
            }
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
    }

    onBlur(): void {
        this._onTouched();
    }

    open(): void {
        if (this.overlayRef) {
            this.hide();
        }

        let originX, overlayX;
        switch (this.opens) {
            case 'left':
                originX = 'start';
                overlayX = 'end';
                break;
            case 'center':
                originX = 'center';
                overlayX = 'center';
                break;
            case 'right':
                originX = 'end';
                overlayX = 'start';
                break;
        }

        // TO-DO: implement this.drops and this.opens!
        this.overlayRef = this.overlay.create({
            backdropClass: 'cdk-overlay-transparent-backdrop',
            hasBackdrop: true,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            positionStrategy: this.overlay
                .position()
                .flexibleConnectedTo(this.elementRef.nativeElement)
                .withPositions([
                    {
                        originX,
                        originY: this.drops === 'up' ? 'top' : 'bottom',
                        overlayX,
                        overlayY: this.drops === 'up' ? 'bottom' : 'top',
                    },
                ]),
        });
        const dateRangePickerPortal = new ComponentPortal(DaterangepickerComponent);
        this.componentRef = this.overlayRef.attach(dateRangePickerPortal);

        // Assign all inputs
        this.componentRef.instance.minDate = this.minDate;
        this.componentRef.instance.maxDate = this.maxDate;
        this.componentRef.instance.autoApply = this.autoApply;
        this.componentRef.instance.alwaysShowCalendars = this.alwaysShowCalendars;
        this.componentRef.instance.showCustomRangeLabel = this.showCustomRangeLabel;
        this.componentRef.instance.linkedCalendars = this.linkedCalendars;
        this.componentRef.instance.dateLimit = this.dateLimit;
        this.componentRef.instance.singleDatePicker = this.singleDatePicker;
        this.componentRef.instance.showWeekNumbers = this.showWeekNumbers;
        this.componentRef.instance.showISOWeekNumbers = this.showISOWeekNumbers;
        this.componentRef.instance.showDropdowns = this.showDropdowns;
        this.componentRef.instance.showClearButton = this.showClearButton;
        this.componentRef.instance.customRangeDirection = this.customRangeDirection;
        this.componentRef.instance.ranges = this.ranges;
        this.componentRef.instance.firstMonthDayClass = this.firstMonthDayClass;
        this.componentRef.instance.lastMonthDayClass = this.lastMonthDayClass;
        this.componentRef.instance.emptyWeekRowClass = this.emptyWeekRowClass;
        this.componentRef.instance.firstDayOfNextMonthClass = this.firstDayOfNextMonthClass;
        this.componentRef.instance.lastDayOfPreviousMonthClass = this.lastDayOfPreviousMonthClass;
        this.componentRef.instance.keepCalendarOpeningWithRange = this.keepCalendarOpeningWithRange;
        this.componentRef.instance.showRangeLabelOnInput = this.showRangeLabelOnInput;
        this.componentRef.instance.showCancel = this.showCancel;
        this.componentRef.instance.lockStartDate = this.lockStartDate;
        this.componentRef.instance.timePicker = this.timePicker;
        this.componentRef.instance.timePicker24Hour = this.timePicker24Hour;
        this.componentRef.instance.timePickerIncrement = this.timePickerIncrement;
        this.componentRef.instance.timePickerSeconds = this.timePickerSeconds;
        this.componentRef.instance.closeOnAutoApply = this.closeOnAutoApply;
        this.componentRef.instance.locale = this.locale;

        this.componentRef.instance.isInvalidDate = this.isInvalidDate;
        this.componentRef.instance.isCustomDate = this.isCustomDate;
        this.componentRef.instance.isTooltipDate = this.isTooltipDate;

        // Set the value
        this.setValue(this.value);

        const localeDiffer = this.differs.find(this.locale).create();
        if (localeDiffer) {
            const changes = localeDiffer.diff(this.locale);
            if (changes) {
                this.componentRef.instance.updateLocale(this.locale);
            }
        }

        // Subscribe to all outputs
        this.componentRef.instance.startDateChanged
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe((itemChanged: { startDate: Date }) => {
                this.startDateChanged.emit(itemChanged);
            });

        this.componentRef.instance.endDateChanged
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe((itemChanged) => {
                this.endDateChanged.emit(itemChanged);
            });

        this.componentRef.instance.rangeClicked
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe((range) => {
                this.rangeClicked.emit(range);
            });

        this.componentRef.instance.datesUpdated
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe((range) => {
                this.datesUpdated.emit(range);
            });

        this.componentRef.instance.chosenDate
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe((chosenDate) => {
                if (chosenDate) {
                    const { endDate, startDate } = chosenDate;
                    this.value = { endDate, startDate };
                    this.onChange.emit(this.value);
                    if (typeof chosenDate.chosenLabel === 'string') {
                        this._el.nativeElement.value = chosenDate.chosenLabel;
                    }

                    this.hide();
                }
            });

        this.componentRef.instance.closeDateRangePicker
            .asObservable()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.hide();
            });

        // Close the DateRangePicker when the backdrop is clicked
        this.overlayRef
            .backdropClick()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.hide();
            });
    }

    hide(): void {
        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.destroy$.next();
            this.overlayRef = null;
            this.componentRef = null;
        }
    }

    toggle(): void {
        if (this.overlayRef) {
            this.hide();
        } else {
            this.open();
        }
    }

    clear(): void {
        if (this.componentRef) {
            this.componentRef.instance.clear();
        }
    }

    writeValue(value: { startDate: Date | string; endDate: Date | string } | Date): void {
        console.log(value);
        if (value instanceof Date) {
            this.value = { startDate: value };
        } else if (value) {
            this.value = { startDate: moment(value.startDate), endDate: moment(value.endDate) };
        } else {
            this.value = null;
        }
        this.setValue(this.value);
    }

    registerOnChange(fn): void {
        this._onChange = fn;
    }

    registerOnTouched(fn): void {
        this._onTouched = fn;
    }

    private setValue(value: { startDate: Date; endDate: Date }): void {
        if (this.componentRef) {
            if (value) {
                if (value[this._startKey]) {
                    this.componentRef.instance.setStartDate(value[this._startKey]);
                }
                if (value[this._endKey]) {
                    this.componentRef.instance.setEndDate(value[this._endKey]);
                }
                this.componentRef.instance.calculateChosenLabel();
                if (this.componentRef.instance.chosenLabel) {
                    this._el.nativeElement.value = this.componentRef.instance.chosenLabel;
                }
            } else {
                this.componentRef.instance.clear();
            }
        }

        this._el.nativeElement.value = value ? this.calculateChosenLabel(value.startDate, value.endDate) : null;
    }

    inputChanged(e): void {
        if (e.target.tagName.toLowerCase() !== 'input') {
            return;
        }

        if (!e.target.value.length) {
            return;
        }

        if (this.componentRef) {
            const dateString = e.target.value.split(this.componentRef.instance.locale.separator);
            let start = null,
                end = null;
            if (dateString.length === 2) {
                start = moment(dateString[0], this.componentRef.instance.locale.format);
                end = moment(dateString[1], this.componentRef.instance.locale.format);
            }
            if (this.singleDatePicker || start === null || end === null) {
                start = moment(e.target.value, this.componentRef.instance.locale.format);
                end = start;
            }
            if (!start.isValid() || !end.isValid()) {
                return;
            }
            this.componentRef.instance.setStartDate(start);
            this.componentRef.instance.setEndDate(end);
            this.componentRef.instance.updateView();
        }
    }

    calculateChosenLabel(startDate: Date, endDate: Date): string {
        const format = this.locale.displayFormat ? this.locale.displayFormat : this.locale.format;

        if (this.singleDatePicker) {
            return format(startDate, format);
        }

        if (startDate && endDate) {
            return format(startDate, format) + this.locale.separator + format(endDate, format);
        }

        return null;
    }

    /**
     *  build the locale config
     */
    private _buildLocale() {
        this.locale = { ...this._localeService.config, ...this.locale };
        if (!this.locale.format) {
            if (this.timePicker) {
                this.locale.format = 'lll';
            } else {
                this.locale.format = 'L';
            }
        }
    }
}
