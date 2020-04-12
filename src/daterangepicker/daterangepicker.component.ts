import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    forwardRef,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { addDays, addMonths, endOfDay, format, getHours, getMonth, getYear, isBefore, startOfDay, subDays, subMonths } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocaleConfig } from './daterangepicker.config';
import { LocaleService } from './locale.service';

export enum SideEnum {
    left = 'left',
    right = 'right',
}

@Component({
    selector: 'ngx-daterangepicker-material',
    styleUrls: ['./daterangepicker.component.scss'],
    templateUrl: './daterangepicker.component.html',
    host: {
        '(click)': 'handleInternalClick($event)',
    },
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DaterangepickerComponent),
            multi: true,
        },
    ],
})
export class DaterangepickerComponent implements OnInit, OnDestroy {
    private _old: { start: any; end: any } = { start: null, end: null };
    chosenLabel: string;
    calendarVariables: { left: any; right: any } = { left: {}, right: {} };
    tooltiptext = []; // for storing tooltiptext
    timepickerVariables: { left: any; right: any } = { left: {}, right: {} };

    daterangepicker: { start: FormControl; end: FormControl } = { start: new FormControl(), end: new FormControl() };
    fromMonthControl = new FormControl();
    fromYearControl = new FormControl();
    toMonthControl = new FormControl();
    toYearControl = new FormControl();

    applyBtn: { disabled: boolean } = { disabled: false };
    @Input()
    startDate = startOfDay(new Date());
    @Input()
    endDate = endOfDay(new Date());

    @Input()
    dateLimit: number = null;
    // used in template for compile time support of enum values.
    sideEnum = SideEnum;

    @Input()
    minDate: Date = null;
    @Input()
    maxDate: Date = null;
    @Input()
    autoApply = false;
    @Input()
    singleDatePicker = false;
    @Input()
    showDropdowns = false;
    @Input()
    showWeekNumbers = false;
    @Input()
    showISOWeekNumbers = false;
    @Input()
    linkedCalendars = false;
    @Input()
    autoUpdateInput = true;
    @Input()
    alwaysShowCalendars = false;
    @Input()
    maxSpan = false;
    @Input()
    lockStartDate = false;
    // timepicker variables
    @Input()
    timePicker = false;
    @Input()
    timePicker24Hour = false;
    @Input()
    timePickerIncrement = 1;
    @Input()
    timePickerSeconds = false;
    // end of timepicker variables
    @Input()
    showClearButton = false;
    @Input()
    firstMonthDayClass: string = null;
    @Input()
    lastMonthDayClass: string = null;
    @Input()
    emptyWeekRowClass: string = null;
    @Input()
    firstDayOfNextMonthClass: string = null;
    @Input()
    lastDayOfPreviousMonthClass: string = null;
    _locale: LocaleConfig = {};
    @Input() set locale(value) {
        this._locale = { ...this._localeService.config, ...value };
    }
    get locale(): any {
        return this._locale;
    }
    // custom ranges
    _ranges: any = {};

    @Input() set ranges(value) {
        this._ranges = value;
        this.renderRanges();
    }
    get ranges(): any {
        return this._ranges;
    }

    @Input()
    showCustomRangeLabel: boolean;
    @Input()
    showCancel = false;
    @Input()
    keepCalendarOpeningWithRange = false;
    @Input()
    showRangeLabelOnInput = false;
    @Input()
    customRangeDirection = false;

    @Input()
    isInvalidDate(date: Date) {
        return false;
    }
    @Input()
    isCustomDate(date: Date) {
        return false;
    }
    @Input()
    isTooltipDate(date: Date): string {
        return null;
    }

    chosenRange: string;
    rangesArray: Array<any> = [];

    // some state information
    isShown: Boolean = false;
    inline = true;
    leftCalendar: { month: Date; calendar?: Date[][] } = { month: null };
    rightCalendar: { month: Date; calendar?: Date[][] } = { month: null };
    showCalInRanges: Boolean = false;

    @Input() closeOnAutoApply = true;

    @Output() chosenDate: EventEmitter<{ chosenLabel: string; startDate: Date; endDate: Date }> = new EventEmitter();
    @Output() rangeClicked: EventEmitter<{ label: string; dates: [Date, Date] }> = new EventEmitter();
    @Output() datesUpdated: EventEmitter<{ startDate: Date; endDate: Date }> = new EventEmitter();
    @Output() startDateChanged: EventEmitter<{ startDate: Date }> = new EventEmitter();
    @Output() endDateChanged: EventEmitter<{ endDate: Date }> = new EventEmitter();
    @Output() closeDateRangePicker: EventEmitter<void> = new EventEmitter();

    @ViewChild('pickerContainer', { static: true }) pickerContainer: ElementRef;

    constructor(private el: ElementRef, private _ref: ChangeDetectorRef, private _localeService: LocaleService) {}

    destroy$ = new Subject();

    ngOnInit(): void {
        this.fromMonthControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((month) => {
            this.monthChanged(month, SideEnum.left);
        });

        this.fromYearControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((year) => {
            this.yearChanged(year, SideEnum.left);
        });

        this.toMonthControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((month) => {
            this.monthChanged(month, SideEnum.right);
        });

        this.toYearControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((year) => {
            this.yearChanged(year, SideEnum.right);
        });

        this._buildLocale();
        const daysOfWeek = [...this.locale.daysOfWeek];
        this.locale.firstDay = this.locale.firstDay % 7;
        if (this.locale.firstDay !== 0) {
            let iterator = this.locale.firstDay;

            while (iterator > 0) {
                daysOfWeek.push(daysOfWeek.shift());
                iterator--;
            }
        }
        this.locale.daysOfWeek = daysOfWeek;
        if (this.inline) {
            this._old.start = new Date(this.startDate.valueOf());
            this._old.end = new Date(this.endDate.valueOf());
        }

        if (this.startDate && this.timePicker) {
            this.setStartDate(this.startDate);
            this.renderTimePicker(SideEnum.left);
        }

        if (this.endDate && this.timePicker) {
            this.setEndDate(this.endDate);
            this.renderTimePicker(SideEnum.right);
        }

        this.updateMonthsInView();
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);
        this.renderRanges();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
    }

    renderRanges(): void {
        this.rangesArray = [];
        let start, end;
        if (typeof this.ranges === 'object') {
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    if (typeof this.ranges[range][0] === 'string') {
                        start = moment(this.ranges[range][0], this.locale.format);
                    } else {
                        start = moment(this.ranges[range][0]);
                    }
                    if (typeof this.ranges[range][1] === 'string') {
                        end = moment(this.ranges[range][1], this.locale.format);
                    } else {
                        end = moment(this.ranges[range][1]);
                    }
                    // If the start or end date exceed those allowed by the minDate or maxSpan
                    // options, shorten the range to the allowable period.
                    if (this.minDate && isBefore(start, this.minDate)) {
                        start = new Date(this.minDate.valueOf());
                    }
                    let maxDate = this.maxDate;
                    if (this.maxSpan && maxDate && new Date(start.valueOf()).add(this.maxSpan).isAfter(maxDate)) {
                        maxDate = new Date(start.valueOf()).add(this.maxSpan);
                    }
                    if (maxDate && end.isAfter(maxDate)) {
                        end = new Date(maxDate.valueOf());
                    }
                    // If the end of the range is before the minimum or the start of the range is
                    // after the maximum, don't display this range option at all.
                    if (
                        (this.minDate && end.isBefore(this.minDate, this.timePicker ? 'minute' : 'day')) ||
                        (maxDate && start.isAfter(maxDate, this.timePicker ? 'minute' : 'day'))
                    ) {
                        continue;
                    }
                    // Support unicode chars in the range names.
                    const elem = document.createElement('textarea');
                    elem.innerHTML = range;
                    const rangeHtml = elem.value;
                    this.ranges[rangeHtml] = [start, end];
                }
            }
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    this.rangesArray.push(range);
                }
            }
            if (this.showCustomRangeLabel) {
                this.rangesArray.push(this.locale.customRangeLabel);
            }
            this.showCalInRanges = !this.rangesArray.length || this.alwaysShowCalendars;
            if (!this.timePicker) {
                this.startDate = startOfDay(this.startDate);
                this.endDate = endOfDay(this.endDate);
            }
        }
    }

    renderTimePicker(side: SideEnum): void {
        if (side === SideEnum.right && !this.endDate) {
            return;
        }
        let selected, minDate;
        const maxDate = this.maxDate;
        if (side === SideEnum.left) {
            (selected = new Date(this.startDate.valueOf())), (minDate = this.minDate);
        } else if (side === SideEnum.right) {
            (selected = new Date(this.endDate.valueOf())), (minDate = this.startDate);
        }
        const start = this.timePicker24Hour ? 0 : 1;
        const end = this.timePicker24Hour ? 23 : 12;
        this.timepickerVariables[side] = {
            hours: [],
            minutes: [],
            minutesLabel: [],
            seconds: [],
            secondsLabel: [],
            disabledHours: [],
            disabledMinutes: [],
            disabledSeconds: [],
            selectedHour: 0,
            selectedMinute: 0,
            selectedSecond: 0,
        };
        // generate hours
        for (let i = start; i <= end; i++) {
            let i_in_24 = i;
            if (!this.timePicker24Hour) {
                i_in_24 = selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : i === 12 ? 0 : i;
            }

            const time = new Date(selected.valueOf()).hour(i_in_24);
            let disabled = false;
            if (minDate && time.minute(59).isBefore(minDate)) {
                disabled = true;
            }
            if (maxDate && time.minute(0).isAfter(maxDate)) {
                disabled = true;
            }

            this.timepickerVariables[side].hours.push(i);
            if (i_in_24 === selected.hour() && !disabled) {
                this.timepickerVariables[side].selectedHour = i;
            } else if (disabled) {
                this.timepickerVariables[side].disabledHours.push(i);
            }
        }
        // generate minutes
        for (let i = 0; i < 60; i += this.timePickerIncrement) {
            const padded = i < 10 ? '0' + i : i;
            const time = new Date(selected.valueOf()).minute(i);

            let disabled = false;
            if (minDate && time.second(59).isBefore(minDate)) {
                disabled = true;
            }
            if (maxDate && time.second(0).isAfter(maxDate)) {
                disabled = true;
            }
            this.timepickerVariables[side].minutes.push(i);
            this.timepickerVariables[side].minutesLabel.push(padded);
            if (selected.minute() === i && !disabled) {
                this.timepickerVariables[side].selectedMinute = i;
            } else if (disabled) {
                this.timepickerVariables[side].disabledMinutes.push(i);
            }
        }
        // generate seconds
        if (this.timePickerSeconds) {
            for (let i = 0; i < 60; i++) {
                const padded = i < 10 ? '0' + i : i;
                const time = new Date(selected.valueOf()).second(i);

                let disabled = false;
                if (minDate && time.isBefore(minDate)) {
                    disabled = true;
                }
                if (maxDate && time.isAfter(maxDate)) {
                    disabled = true;
                }

                this.timepickerVariables[side].seconds.push(i);
                this.timepickerVariables[side].secondsLabel.push(padded);
                if (selected.second() === i && !disabled) {
                    this.timepickerVariables[side].selectedSecond = i;
                } else if (disabled) {
                    this.timepickerVariables[side].disabledSeconds.push(i);
                }
            }
        }
        // generate AM/PM
        if (!this.timePicker24Hour) {
            if (minDate && new Date(selected.valueOf()).hour(12).minute(0).second(0).isBefore(minDate)) {
                this.timepickerVariables[side].amDisabled = true;
            }

            if (maxDate && new Date(selected.valueOf()).hour(0).minute(0).second(0).isAfter(maxDate)) {
                this.timepickerVariables[side].pmDisabled = true;
            }
            if (selected.hour() >= 12) {
                this.timepickerVariables[side].ampmModel = 'PM';
            } else {
                this.timepickerVariables[side].ampmModel = 'AM';
            }
        }
        this.timepickerVariables[side].selected = selected;
    }

    renderCalendar(side: SideEnum): void {
        const mainCalendar = side === SideEnum.left ? this.leftCalendar : this.rightCalendar;
        const month = getMonth(mainCalendar.month);
        const year = getYear(mainCalendar.month);
        const hour = getHours(mainCalendar.month);
        const minute = mainCalendar.month.minute();
        const second = mainCalendar.month.second();
        const daysInMonth = moment([year, month]).daysInMonth();
        const firstDay = moment([year, month, 1]);
        const lastDay = moment([year, month, daysInMonth]);
        const lastMonth = moment(firstDay).subtract(1, 'month').month();
        const lastYear = moment(firstDay).subtract(1, 'month').year();
        const daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
        const dayOfWeek = firstDay.day();
        // initialize a 6 rows x 7 columns array for the calendar
        const calendar: any = [];
        calendar.firstDay = firstDay;
        calendar.lastDay = lastDay;

        for (let i = 0; i < 6; i++) {
            calendar[i] = [];
        }

        // populate the calendar with date objects
        let startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
        if (startDay > daysInLastMonth) {
            startDay -= 7;
        }

        if (dayOfWeek === this.locale.firstDay) {
            startDay = daysInLastMonth - 6;
        }

        let curDate = moment([lastYear, lastMonth, startDay, 12, minute, second]);

        for (let i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add(24, 'hour')) {
            if (i > 0 && col % 7 === 0) {
                col = 0;
                row++;
            }
            calendar[row][col] = new Date(curDate.valueOf()).hour(hour).minute(minute).second(second);
            curDate.hour(12);

            if (
                this.minDate &&
                format(calendar[row][col], 'YYYY-MM-DD') === format(this.minDate, 'YYYY-MM-DD') &&
                calendar[row][col].isBefore(this.minDate) &&
                side === 'left'
            ) {
                calendar[row][col] = new Date(this.minDate.valueOf());
            }

            if (
                this.maxDate &&
                format(calendar[row][col], 'YYYY-MM-DD') === format(this.maxDate, 'YYYY-MM-DD') &&
                calendar[row][col].isAfter(this.maxDate) &&
                side === 'right'
            ) {
                calendar[row][col] = new Date(this.maxDate.valueOf());
            }
        }

        // make the calendar object available to hoverDate/clickDate
        if (side === SideEnum.left) {
            this.leftCalendar.calendar = calendar;
        } else {
            this.rightCalendar.calendar = calendar;
        }
        //
        // Display the calendar
        //
        const minDate = side === 'left' ? this.minDate : this.startDate;
        let maxDate = this.maxDate;
        // adjust maxDate to reflect the dateLimit setting in order to
        // grey out end dates beyond the dateLimit
        if (this.endDate === null && this.dateLimit) {
            const maxLimit = new Date(this.startDate.valueOf()).add(this.dateLimit, 'day').endOf('day');
            if (!maxDate || maxLimit.isBefore(maxDate)) {
                maxDate = maxLimit;
            }
        }

        this.calendarVariables[side] = {
            month,
            year,
            hour,
            minute,
            second,
            daysInMonth,
            firstDay,
            lastDay,
            lastMonth,
            lastYear,
            daysInLastMonth,
            dayOfWeek,
            // other vars
            calRows: Array.from(Array(6).keys()),
            calCols: Array.from(Array(7).keys()),
            classes: {},
            minDate,
            maxDate,
            calendar,
        };
        if (this.showDropdowns) {
            const currentMonth = calendar[1][1].month();
            const currentYear = calendar[1][1].year();
            const realCurrentYear = getYear(new Date());
            const maxYear = (maxDate && getYear(maxDate)) || realCurrentYear + 5;
            const minYear = (minDate && getYear(minDate)) || realCurrentYear - 50;
            const inMinYear = currentYear === minYear;
            const inMaxYear = currentYear === maxYear;
            const years = [];
            for (let y = minYear; y <= maxYear; y++) {
                years.push(y);
            }
            this.calendarVariables[side].dropdowns = {
                currentMonth: currentMonth,
                currentYear: currentYear,
                maxYear: maxYear,
                minYear: minYear,
                inMinYear: inMinYear,
                inMaxYear: inMaxYear,
                monthArrays: Array.from(Array(12).keys()),
                yearArrays: years,
            };

            if (side === SideEnum.left) {
                this.fromMonthControl.setValue(currentMonth, { emitEvent: false });
                this.fromYearControl.setValue(currentYear, { emitEvent: false });
            } else if (side === SideEnum.right) {
                this.toMonthControl.setValue(currentMonth, { emitEvent: false });
                this.toYearControl.setValue(currentYear, { emitEvent: false });
            }
        }

        this._buildCells(calendar, side);
    }
    setStartDate(startDate): void {
        if (typeof startDate === 'string') {
            this.startDate = moment(startDate, this.locale.format);
        }

        if (typeof startDate === 'object') {
            this.startDate = moment(startDate);
        }
        if (!this.timePicker) {
            this.startDate = startOfDay(this.startDate);
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.startDate.minute(Math.round(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
        }

        if (this.minDate && this.startDate.isBefore(this.minDate)) {
            this.startDate = new Date(this.minDate.valueOf());
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.round(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
            }
        }

        if (this.maxDate && this.startDate.isAfter(this.maxDate)) {
            this.startDate = new Date(this.maxDate.valueOf());
            if (this.timePicker && this.timePickerIncrement) {
                this.startDate.minute(Math.floor(this.startDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
            }
        }

        if (!this.isShown) {
            this.updateElement();
        }
        this.startDateChanged.emit({ startDate: this.startDate });
        this.updateMonthsInView();
    }

    setEndDate(endDate): void {
        if (typeof endDate === 'string') {
            this.endDate = moment(endDate, this.locale.format);
        }

        if (typeof endDate === 'object') {
            this.endDate = moment(endDate);
        }
        if (!this.timePicker) {
            this.endDate = this.endDate.add(1, 'd').startOf('day').subtract(1, 'second');
        }

        if (this.timePicker && this.timePickerIncrement) {
            this.endDate.minute(Math.round(this.endDate.minute() / this.timePickerIncrement) * this.timePickerIncrement);
        }

        if (this.endDate.isBefore(this.startDate)) {
            this.endDate = new Date(this.startDate.valueOf());
        }

        if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
            this.endDate = new Date(this.maxDate.valueOf());
        }

        if (this.dateLimit && new Date(this.startDate.valueOf()).add(this.dateLimit, 'day').isBefore(this.endDate)) {
            this.endDate = new Date(this.startDate.valueOf()).add(this.dateLimit, 'day');
        }

        if (!this.isShown) {
            // this.updateElement();
        }
        this.endDateChanged.emit({ endDate: this.endDate });
        this.updateMonthsInView();
    }

    updateView(): void {
        if (this.timePicker) {
            this.renderTimePicker(SideEnum.left);
            this.renderTimePicker(SideEnum.right);
        }
        this.updateMonthsInView();
        this.updateCalendars();
    }

    updateMonthsInView(): void {
        if (this.endDate) {
            // if both dates are visible already, do nothing
            if (
                !this.singleDatePicker &&
                this.leftCalendar.month &&
                this.rightCalendar.month &&
                ((this.startDate &&
                    this.leftCalendar &&
                    format(this.startDate, 'YYYY-MM') === format(this.leftCalendar.month, 'YYYY-MM')) ||
                    (this.startDate &&
                        this.rightCalendar &&
                        format(this.startDate, 'YYYY-MM') === format(this.rightCalendar.month, 'YYYY-MM'))) &&
                (format(this.endDate, 'YYYY-MM') === format(this.leftCalendar.month, 'YYYY-MM') ||
                    format(this.endDate, 'YYYY-MM') === format(this.rightCalendar.month, 'YYYY-MM'))
            ) {
                return;
            }
            if (this.startDate) {
                this.leftCalendar.month = new Date(this.startDate.valueOf()).date(2);
                if (
                    !this.linkedCalendars &&
                    (this.endDate.month() !== this.startDate.month() || this.endDate.year() !== this.startDate.year())
                ) {
                    this.rightCalendar.month = new Date(this.endDate.valueOf()).date(2);
                } else {
                    this.rightCalendar.month = new Date(this.startDate.valueOf()).date(2).add(1, 'month');
                }
            }
        } else {
            if (
                format(this.leftCalendar.month, 'YYYY-MM') !== format(this.startDate, 'YYYY-MM') &&
                format(this.rightCalendar.month, 'YYYY-MM') !== format(this.startDate, 'YYYY-MM')
            ) {
                this.leftCalendar.month = new Date(this.startDate.valueOf()).date(2);
                this.rightCalendar.month = new Date(this.startDate.valueOf()).date(2).add(1, 'month');
            }
        }
        if (this.maxDate && this.linkedCalendars && !this.singleDatePicker && this.rightCalendar.month > this.maxDate) {
            this.rightCalendar.month = new Date(this.maxDate.valueOf()).date(2);
            this.leftCalendar.month = new Date(this.maxDate.valueOf()).date(2).subtract(1, 'month');
        }
    }

    /**
     *  This is responsible for updating the calendars
     */
    updateCalendars(): void {
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);

        if (this.endDate === null) {
            return;
        }
        this.calculateChosenLabel();
    }

    updateElement(): void {
        const dateFormat = this.locale.displayFormat ? this.locale.displayFormat : this.locale.format;
        if (!this.singleDatePicker && this.autoUpdateInput) {
            if (this.startDate && this.endDate) {
                // if we use ranges and should show range label on input
                if (
                    this.rangesArray.length &&
                    this.showRangeLabelOnInput === true &&
                    this.chosenRange &&
                    this.locale.customRangeLabel !== this.chosenRange
                ) {
                    this.chosenLabel = this.chosenRange;
                } else {
                    this.chosenLabel = format(this.startDate, dateFormat) + this.locale.separator + format(this.endDate, dateFormat);
                }
            }
        } else if (this.autoUpdateInput) {
            this.chosenLabel = format(this.startDate, dateFormat);
        }
    }

    /**
     * this should calculate the label
     */
    calculateChosenLabel(): void {
        if (!this.locale || !this.locale.separator) {
            this._buildLocale();
        }
        let customRange = true;
        let i = 0;
        if (this.rangesArray.length > 0) {
            for (const range in this.ranges) {
                if (this.ranges[range]) {
                    if (this.timePicker) {
                        const dateFormat = this.timePickerSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm';
                        // ignore times when comparing dates if time picker seconds is not enabled
                        if (
                            format(this.startDate, dateFormat) === format(this.ranges[range][0], dateFormat) &&
                            format(this.endDate, dateFormat) === format(this.ranges[range][1], dateFormat)
                        ) {
                            customRange = false;
                            this.chosenRange = this.rangesArray[i];
                            break;
                        }
                    } else {
                        // ignore times when comparing dates if time picker is not enabled
                        if (
                            format(this.startDate, 'YYYY-MM-DD') === format(this.ranges[range][0], 'YYYY-MM-DD') &&
                            format(this.endDate, 'YYYY-MM-DD') === format(this.ranges[range][1], 'YYYY-MM-DD')
                        ) {
                            customRange = false;
                            this.chosenRange = this.rangesArray[i];
                            break;
                        }
                    }
                    i++;
                }
            }
            if (customRange) {
                if (this.showCustomRangeLabel) {
                    this.chosenRange = this.locale.customRangeLabel;
                } else {
                    this.chosenRange = null;
                }
                // if custom label: show calendar
                this.showCalInRanges = true;
            }
        }

        this.updateElement();
    }

    clickApply(e?): void {
        if (!this.singleDatePicker && this.startDate && !this.endDate) {
            this.endDate = new Date(this.startDate.valueOf());
            this.calculateChosenLabel();
        }

        if (this.isInvalidDate && this.startDate && this.endDate) {
            // get if there are invalid date between range
            const d = new Date(this.startDate.valueOf());
            while (d.isBefore(this.endDate)) {
                if (this.isInvalidDate(d)) {
                    this.endDate = subDays(d, 1);
                    this.calculateChosenLabel();
                    break;
                }
                d = addDays(d, 1);
            }
        }

        if (this.chosenLabel) {
            this.chosenDate.emit({ chosenLabel: this.chosenLabel, startDate: this.startDate, endDate: this.endDate });
        }

        this.datesUpdated.emit({ startDate: this.startDate, endDate: this.endDate });
        if (e || (this.closeOnAutoApply && !e)) {
            this.hide();
        }
    }

    clickCancel(): void {
        this.startDate = this._old.start;
        this.endDate = this._old.end;
        if (this.inline) {
            this.updateView();
        }
        this.hide();
    }

    /**
     * called when month is changed
     * @param month month represented by a number (0 through 11)
     * @param side left or right
     */
    monthChanged(month: number, side: SideEnum): void {
        const year = this.calendarVariables[side].dropdowns.currentYear;
        this.monthOrYearChanged(month, year, side);
    }

    /**
     * called when year is changed
     * @param year year represented by a number
     * @param side left or right
     */
    yearChanged(year: number, side: SideEnum): void {
        const month = this.calendarVariables[side].dropdowns.currentMonth;
        this.monthOrYearChanged(month, year, side);
    }

    /**
     * called when time is changed
     * @param side left or right
     */
    timeChanged(side: SideEnum): void {
        let hour = parseInt(this.timepickerVariables[side].selectedHour, 10);
        const minute = parseInt(this.timepickerVariables[side].selectedMinute, 10);
        const second = this.timePickerSeconds ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;

        if (!this.timePicker24Hour) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }

        if (side === SideEnum.left) {
            const start = new Date(this.startDate.valueOf());
            start.hour(hour);
            start.minute(minute);
            start.second(second);
            this.setStartDate(start);
            if (this.singleDatePicker) {
                this.endDate = new Date(this.startDate.valueOf());
            } else if (this.endDate && this.endDate.format('YYYY-MM-DD') === start.format('YYYY-MM-DD') && this.endDate.isBefore(start)) {
                this.setEndDate(new Date(start.valueOf()));
            }
        } else if (this.endDate) {
            const end = new Date(this.endDate.valueOf());
            end.hour(hour);
            end.minute(minute);
            end.second(second);
            this.setEndDate(end);
        }

        // update the calendars so all clickable dates reflect the new time component
        this.updateCalendars();

        // re-render the time pickers because changing one selection can affect what's enabled in another
        this.renderTimePicker(SideEnum.left);
        this.renderTimePicker(SideEnum.right);

        if (this.autoApply) {
            this.clickApply();
        }
    }

    /**
     *  call when month or year changed
     * @param month month number 0 -11
     * @param year year eg: 1995
     * @param side left or right
     */
    monthOrYearChanged(month: number, year: number, side: SideEnum): void {
        const isLeft = side === SideEnum.left;

        if (!isLeft) {
            if (year < getYear(this.startDate) || (year === getYear(this.startDate) && month < getMonth(this.startDate))) {
                month = getMonth(this.startDate);
                year = getYear(this.startDate);
            }
        }

        if (this.minDate) {
            if (year < getYear(this.minDate) || (year === getYear(this.minDate) && month < getMonth(this.minDate))) {
                month = getMonth(this.minDate);
                year = getYear(this.minDate);
            }
        }

        if (this.maxDate) {
            if (year > getYear(this.maxDate) || (year === getYear(this.maxDate) && month > getMonth(this.maxDate))) {
                month = getMonth(this.maxDate);
                year = getYear(this.maxDate);
            }
        }
        this.calendarVariables[side].dropdowns.currentYear = year;
        this.calendarVariables[side].dropdowns.currentMonth = month;
        if (isLeft) {
            this.leftCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.rightCalendar.month = new Date(this.leftCalendar.month.valueOf()).add(1, 'month');
            }
        } else {
            this.rightCalendar.month.month(month).year(year);
            if (this.linkedCalendars) {
                this.leftCalendar.month = new Date(this.rightCalendar.month.valueOf()).subtract(1, 'month');
            }
        }
        this.updateCalendars();
    }

    /**
     * Click on previous month
     * @param side left or right calendar
     */
    clickPrev(side: SideEnum) {
        if (side === SideEnum.left) {
            this.leftCalendar.month = subMonths(this.leftCalendar.month, 1);
            if (this.linkedCalendars) {
                this.rightCalendar.month = subMonths(this.rightCalendar.month, 1);
            }
        } else {
            this.rightCalendar.month = subMonths(this.rightCalendar.month, 1);
        }
        this.updateCalendars();
    }

    /**
     * Click on next month
     * @param side left or right calendar
     */
    clickNext(side: SideEnum): void {
        if (side === SideEnum.left) {
            this.leftCalendar.month = addMonths(this.leftCalendar.month, 1);
        } else {
            this.rightCalendar.month = addMonths(this.rightCalendar.month, 1);
            if (this.linkedCalendars) {
                this.leftCalendar.month = addMonths(this.leftCalendar.month, 1);
            }
        }
        this.updateCalendars();
    }

    /**
     * When hovering a date
     * @param e event: get value by e.target.value
     * @param side left or right
     * @param row row position of the current date clicked
     * @param col col position of the current date clicked
     */
    hoverDate(e, side: SideEnum, row: number, col: number) {
        const leftCalDate = this.calendarVariables.left.calendar[row][col];
        const rightCalDate = this.calendarVariables.right.calendar[row][col];
        const tooltip = side === SideEnum.left ? this.tooltiptext[leftCalDate] : this.tooltiptext[rightCalDate];
        if (tooltip.length > 0) {
            e.target.setAttribute('title', tooltip);
        }
    }

    /**
     * When selecting a date
     * @param e event: get value by e.target.value
     * @param side left or right
     * @param row row position of the current date clicked
     * @param col col position of the current date clicked
     */
    clickDate(e, side: SideEnum, row: number, col: number) {
        if (e.target.tagName === 'TD') {
            if (!e.target.classList.contains('available')) {
                return;
            }
        } else if (e.target.tagName === 'SPAN') {
            if (!e.target.parentElement.classList.contains('available')) {
                return;
            }
        }
        if (this.rangesArray.length) {
            this.chosenRange = this.locale.customRangeLabel;
        }

        let date = side === SideEnum.left ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

        if (
            (this.endDate || (date.isBefore(this.startDate, 'day') && this.customRangeDirection === false)) &&
            this.lockStartDate === false
        ) {
            // picking start
            if (this.timePicker) {
                date = this._getDateWithTime(date, SideEnum.left);
            }
            this.endDate = null;
            this.setStartDate(new Date(date.valueOf()));
        } else if (!this.endDate && date.isBefore(this.startDate) && this.customRangeDirection === false) {
            // special case: clicking the same date for start/end,
            // but the time of the end date is before the start date
            this.setEndDate(new Date(this.startDate.valueOf()));
        } else {
            // picking end
            if (this.timePicker) {
                date = this._getDateWithTime(date, SideEnum.right);
            }
            if (date.isBefore(this.startDate, 'day') === true && this.customRangeDirection === true) {
                this.setEndDate(this.startDate);
                this.setStartDate(new Date(date.valueOf()));
            } else {
                this.setEndDate(new Date(date.valueOf()));
            }

            if (this.autoApply) {
                this.calculateChosenLabel();
                this.clickApply();
            }
        }

        if (this.singleDatePicker) {
            this.setEndDate(this.startDate);
            this.updateElement();
            if (this.autoApply) {
                this.clickApply();
            }
        }

        this.updateView();

        if (this.autoApply && this.startDate && this.endDate) {
            this.clickApply();
        }

        // This is to cancel the blur event handler if the mouse was in one of the inputs
        e.stopPropagation();
    }

    /**
     *  Click on the custom range
     * @param label
     */
    clickRange(label: string): void {
        this.chosenRange = label;
        if (label === this.locale.customRangeLabel) {
            this.isShown = true; // show calendars
            this.showCalInRanges = true;
        } else {
            const dates = this.ranges[label];
            this.startDate = new Date(dates[0].valueOf());
            this.endDate = new Date(dates[1].valueOf());
            if (this.showRangeLabelOnInput && label !== this.locale.customRangeLabel) {
                this.chosenLabel = label;
            } else {
                this.calculateChosenLabel();
            }
            this.showCalInRanges = !this.rangesArray.length || this.alwaysShowCalendars;

            if (!this.timePicker) {
                this.startDate.startOf('day');
                this.endDate.endOf('day');
            }

            if (!this.alwaysShowCalendars) {
                this.isShown = false; // hide calendars
            }
            this.rangeClicked.emit({ label: label, dates: dates });
            if (!this.keepCalendarOpeningWithRange || this.autoApply) {
                this.clickApply();
            } else {
                if (!this.alwaysShowCalendars) {
                    return this.clickApply();
                }
                if (this.maxDate && this.maxDate.isSame(dates[0], 'month')) {
                    this.rightCalendar.month.month(dates[0].month());
                    this.rightCalendar.month.year(dates[0].year());
                    this.leftCalendar.month.month(dates[0].month() - 1);
                    this.leftCalendar.month.year(dates[1].year());
                } else {
                    this.leftCalendar.month.month(dates[0].month());
                    this.leftCalendar.month.year(dates[0].year());
                    if (this.linkedCalendars || dates[0].month() === dates[1].month()) {
                        const nextMonth = new Date(dates[0].valueOf()).add(1, 'month');
                        this.rightCalendar.month.month(nextMonth.month());
                        this.rightCalendar.month.year(nextMonth.year());
                    } else {
                        this.rightCalendar.month.month(dates[1].month());
                        this.rightCalendar.month.year(dates[1].year());
                    }
                }
                this.updateCalendars();
                if (this.timePicker) {
                    this.renderTimePicker(SideEnum.left);
                    this.renderTimePicker(SideEnum.right);
                }
            }
        }
    }

    show(e?) {
        if (this.isShown) {
            return;
        }
        this._old.start = new Date(this.startDate.valueOf());
        this._old.end = new Date(this.endDate.valueOf());
        this.isShown = true;
        this.updateView();
    }

    hide(): void {
        this.closeDateRangePicker.emit();

        if (!this.isShown) {
            return;
        }
        // incomplete date selection, revert to last values
        if (!this.endDate) {
            if (this._old.start) {
                this.startDate = new Date(this._old.start.valueOf());
            }
            if (this._old.end) {
                this.endDate = new Date(this._old.end.valueOf());
            }
        }

        // if a new date range was selected, invoke the user callback function
        if (!this.startDate.isSame(this._old.start) || !this.endDate.isSame(this._old.end)) {
            // this.callback(this.startDate, this.endDate, this.chosenLabel);
        }

        // if picker is attached to a text input, update it
        this.updateElement();
        this.isShown = false;
        this._ref.detectChanges();

        this.closeDateRangePicker.emit();
    }

    /**
     * handle click on all element in the component, useful for outside of click
     * @param e event
     */
    handleInternalClick(e): void {
        e.stopPropagation();
    }

    /**
     * update the locale options
     * @param locale
     */
    updateLocale(locale) {
        for (const key in locale) {
            if (locale.hasOwnProperty(key)) {
                this.locale[key] = locale[key];
                if (key === 'customRangeLabel') {
                    this.renderRanges();
                }
            }
        }
    }
    /**
     *  clear the daterange picker
     */
    clear(): void {
        this.startDate = startOfDay(new Date());
        this.endDate = endOfDay(new Date());
        this.chosenDate.emit({ chosenLabel: '', startDate: null, endDate: null });
        this.datesUpdated.emit({ startDate: null, endDate: null });
        this.hide();
    }

    /**
     * Find out if the selected range should be disabled if it doesn't
     * fit into minDate and maxDate limitations.
     */
    disableRange(range) {
        if (range === this.locale.customRangeLabel) {
            return false;
        }
        const rangeMarkers = this.ranges[range];
        const areBothBefore = rangeMarkers.every((date) => {
            if (!this.minDate) {
                return false;
            }
            return date.isBefore(this.minDate);
        });

        const areBothAfter = rangeMarkers.every((date) => {
            if (!this.maxDate) {
                return false;
            }
            return date.isAfter(this.maxDate);
        });
        return areBothBefore || areBothAfter;
    }
    /**
     *
     * @param date the date to add time
     * @param side left or right
     */
    private _getDateWithTime(date, side: SideEnum): Date {
        let hour = parseInt(this.timepickerVariables[side].selectedHour, 10);
        if (!this.timePicker24Hour) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }
        const minute = parseInt(this.timepickerVariables[side].selectedMinute, 10);
        const second = this.timePickerSeconds ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;
        return new Date(date.valueOf()).hour(hour).minute(minute).second(second);
    }

    /**
     *  build the locale config
     */
    private _buildLocale() {
        this.locale = { ...this._localeService.config, ...this.locale };
        if (!this.locale.format) {
            if (this.timePicker) {
                this.locale.format = moment.localeData().longDateFormat('lll');
            } else {
                this.locale.format = moment.localeData().longDateFormat('L');
            }
        }
    }

    private _buildCells(calendar, side: SideEnum) {
        for (let row = 0; row < 6; row++) {
            this.calendarVariables[side].classes[row] = {};
            const rowClasses = [];
            if (this.emptyWeekRowClass && !this.hasCurrentMonthDays(this.calendarVariables[side].month, calendar[row])) {
                rowClasses.push(this.emptyWeekRowClass);
            }
            for (let col = 0; col < 7; col++) {
                const classes = [];
                // highlight today's date
                if (calendar[row][col].isSame(new Date(), 'day')) {
                    classes.push('today');
                }
                // highlight weekends
                if (calendar[row][col].isoWeekday() > 5) {
                    classes.push('weekend');
                }
                // grey out the dates in other months displayed at beginning and end of this calendar
                if (calendar[row][col].month() !== calendar[1][1].month()) {
                    classes.push('off');

                    // mark the last day of the previous month in this calendar
                    if (
                        this.lastDayOfPreviousMonthClass &&
                        (calendar[row][col].month() < calendar[1][1].month() || calendar[1][1].month() === 0) &&
                        calendar[row][col].date() === this.calendarVariables[side].daysInLastMonth
                    ) {
                        classes.push(this.lastDayOfPreviousMonthClass);
                    }

                    // mark the first day of the next month in this calendar
                    if (
                        this.firstDayOfNextMonthClass &&
                        (calendar[row][col].month() > calendar[1][1].month() || calendar[row][col].month() === 0) &&
                        calendar[row][col].date() === 1
                    ) {
                        classes.push(this.firstDayOfNextMonthClass);
                    }
                }
                // mark the first day of the current month with a custom class
                if (
                    this.firstMonthDayClass &&
                    calendar[row][col].month() === calendar[1][1].month() &&
                    calendar[row][col].date() === calendar.firstDay.date()
                ) {
                    classes.push(this.firstMonthDayClass);
                }
                // mark the last day of the current month with a custom class
                if (
                    this.lastMonthDayClass &&
                    calendar[row][col].month() === calendar[1][1].month() &&
                    calendar[row][col].date() === calendar.lastDay.date()
                ) {
                    classes.push(this.lastMonthDayClass);
                }
                // don't allow selection of dates before the minimum date
                if (this.minDate && calendar[row][col].isBefore(this.minDate, 'day')) {
                    classes.push('off', 'disabled');
                }
                // don't allow selection of dates after the maximum date
                if (this.calendarVariables[side].maxDate && calendar[row][col].isAfter(this.calendarVariables[side].maxDate, 'day')) {
                    classes.push('off', 'disabled');
                }
                // don't allow selection of date if a custom function decides it's invalid
                if (this.isInvalidDate(calendar[row][col])) {
                    classes.push('off', 'disabled', 'invalid');
                }
                // highlight the currently selected start date
                if (this.startDate && format(calendar[row][col], 'YYYY-MM-DD') === format(this.startDate, 'YYYY-MM-DD')) {
                    classes.push('active', 'start-date');
                }
                // highlight the currently selected end date
                if (this.endDate != null && format(calendar[row][col], 'YYYY-MM-DD') === format(this.endDate, 'YYYY-MM-DD')) {
                    classes.push('active', 'end-date');
                }
                // highlight dates in-between the selected dates
                if (this.endDate != null && calendar[row][col] > this.startDate && calendar[row][col] < this.endDate) {
                    classes.push('in-range');
                }
                // apply custom classes for this date
                const isCustom = this.isCustomDate(calendar[row][col]);
                if (isCustom !== false) {
                    if (typeof isCustom === 'string') {
                        classes.push(isCustom);
                    } else {
                        Array.prototype.push.apply(classes, isCustom);
                    }
                }
                // apply custom tooltip for this date
                const isTooltip = this.isTooltipDate(calendar[row][col]);
                if (isTooltip) {
                    if (typeof isTooltip === 'string') {
                        this.tooltiptext[calendar[row][col]] = isTooltip; // setting tooltiptext for custom date
                    } else {
                        this.tooltiptext[calendar[row][col]] = 'Put the tooltip as the returned value of isTooltipDate';
                    }
                } else {
                    this.tooltiptext[calendar[row][col]] = '';
                }
                // store classes var
                let cname = '',
                    disabled = false;
                for (let i = 0; i < classes.length; i++) {
                    cname += classes[i] + ' ';
                    if (classes[i] === 'disabled') {
                        disabled = true;
                    }
                }
                if (!disabled) {
                    cname += 'available';
                }
                this.calendarVariables[side].classes[row][col] = cname.replace(/^\s+|\s+$/g, '');
            }
            this.calendarVariables[side].classes[row].classList = rowClasses.join(' ');
        }
    }

    /**
     * Find out if the current calendar row has current month days
     * (as opposed to consisting of only previous/next month days)
     */
    hasCurrentMonthDays(currentMonth, row): boolean {
        for (let day = 0; day < 7; day++) {
            if (row[day].month() === currentMonth) {
                return true;
            }
        }
        return false;
    }
}
