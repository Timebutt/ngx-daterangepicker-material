import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    forwardRef,
    inject,
    Input,
    input,
    OnDestroy,
    OnInit,
    output,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import moment from 'moment';
import { Subject, takeUntil } from 'rxjs';
import { LocaleConfig } from './daterangepicker.config';

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
    standalone: false,
})
export class DaterangepickerComponent implements OnInit, OnDestroy {
    private _ref = inject(ChangeDetectorRef);

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
    readonly startDate = input(moment().startOf('day'));
    readonly endDate = input(moment().endOf('day'));

    readonly dateLimit = input<number>(null);
    // used in template for compile time support of enum values.
    sideEnum = SideEnum;

    readonly minDate = input<moment.Moment>(null);
    readonly maxDate = input<moment.Moment>(null);
    readonly autoApply = input(false);
    readonly singleDatePicker = input(false);
    readonly showDropdowns = input(false);
    readonly showWeekNumbers = input(false);
    readonly showISOWeekNumbers = input(false);
    readonly linkedCalendars = input(false);
    readonly autoUpdateInput = input(true);
    readonly alwaysShowCalendars = input(false);
    readonly maxSpan = input(false);
    readonly lockStartDate = input(false);
    // timepicker variables
    readonly timePicker = input(false);
    readonly timePicker24Hour = input(false);
    readonly timePickerIncrement = input(1);
    readonly timePickerSeconds = input(false);
    // end of timepicker variables
    readonly showClearButton = input(false);
    readonly firstMonthDayClass = input<string>(null);
    readonly lastMonthDayClass = input<string>(null);
    readonly emptyWeekRowClass = input<string>(null);
    readonly firstDayOfNextMonthClass = input<string>(null);
    readonly lastDayOfPreviousMonthClass = input<string>(null);

    defaultLocale: LocaleConfig = {
        direction: 'ltr',
        separator: ' - ',
        weekLabel: 'W',
        applyLabel: 'Okay',
        cancelLabel: 'Cancel',
        clearLabel: 'Clear',
        customRangeLabel: 'Custom range',
        daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        firstDay: 1,
    };
    _locale: LocaleConfig = {};
    @Input() set locale(value) {
        this._locale = { ...this.defaultLocale, ...value };
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

    readonly showCustomRangeLabel = input<boolean>(undefined);
    readonly showCancel = input(false);
    readonly keepCalendarOpeningWithRange = input(false);
    readonly showRangeLabelOnInput = input(false);
    readonly customRangeDirection = input(false);

    @Input()
    isInvalidDate(date: moment.Moment) {
        return false;
    }
    @Input()
    isCustomDate(date: moment.Moment) {
        return false;
    }
    @Input()
    isTooltipDate(date: moment.Moment): string {
        return null;
    }

    chosenRange: string;
    rangesArray: Array<any> = [];
    nowHoveredDate = null;
    pickingDate: boolean = false;

    // some state information
    isShown: Boolean = false;
    inline = true;
    leftCalendar: { month: moment.Moment; calendar?: moment.Moment[][] } = { month: null };
    rightCalendar: { month: moment.Moment; calendar?: moment.Moment[][] } = { month: null };
    showCalInRanges: Boolean = false;
    readonly closeOnAutoApply = input(true);

    readonly chosenDate = output<{
        chosenLabel: string;
        startDate: moment.Moment;
        endDate: moment.Moment;
    }>();
    readonly rangeClicked = output<{
        label: string;
        dates: [moment.Moment, moment.Moment];
    }>();
    readonly datesUpdated = output<{
        startDate: moment.Moment;
        endDate: moment.Moment;
    }>();
    readonly startDateChanged = output<{
        startDate: moment.Moment;
    }>();
    readonly endDateChanged = output<{
        endDate: moment.Moment;
    }>();
    readonly closeDateRangePicker = output<void>();

    @ViewChild('pickerContainer', { static: true }) pickerContainer: ElementRef;

    destroy$ = new Subject<void>();

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
            this._old.start = this.startDate().clone();
            this._old.end = this.endDate().clone();
        }

        const startDate = this.startDate();
        const timePicker = this.timePicker();
        if (startDate && timePicker) {
            this.setStartDate(startDate);
            this.renderTimePicker(SideEnum.left);
        }

        const endDate = this.endDate();
        if (endDate && timePicker) {
            this.setEndDate(endDate);
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
                    const minDate = this.minDate();
                    if (minDate && start.isBefore(minDate)) {
                        start = minDate.clone();
                    }
                    let maxDate = this.maxDate();
                    const maxSpan = this.maxSpan();
                    if (maxSpan && maxDate && start.clone().add(maxSpan).isAfter(maxDate)) {
                        maxDate = start.clone().add(maxSpan);
                    }
                    if (maxDate && end.isAfter(maxDate)) {
                        end = maxDate.clone();
                    }
                    // If the end of the range is before the minimum or the start of the range is
                    // after the maximum, don't display this range option at all.
                    const timePicker = this.timePicker();
                    if (
                        (minDate && end.isBefore(minDate, timePicker ? 'minute' : 'day')) ||
                        (maxDate && start.isAfter(maxDate, timePicker ? 'minute' : 'day'))
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
            if (this.showCustomRangeLabel()) {
                this.rangesArray.push(this.locale.customRangeLabel);
            }
            this.showCalInRanges = !this.rangesArray.length || this.alwaysShowCalendars();
            if (!this.timePicker()) {
                this.startDate = this.startDate().startOf('day');
                this.endDate = this.endDate().endOf('day');
            }
        }
    }
    renderTimePicker(side: SideEnum) {
        let selected, minDate;
        const maxDate = this.maxDate();
        const endDate = this.endDate();
        if (side === SideEnum.left) {
            ((selected = this.startDate().clone()), (minDate = this.minDate()));
        } else if (side === SideEnum.right && endDate) {
            ((selected = endDate.clone()), (minDate = this.startDate()));
        } else if (side === SideEnum.right && !endDate) {
            // don't have an end date, use the start date then put the selected time for the right side as the time
            selected = this._getDateWithTime(this.startDate(), SideEnum.right);
            const startDate = this.startDate();
            if (selected.isBefore(startDate)) {
                selected = startDate.clone(); //set it back to the start date the time was backwards
            }
            minDate = startDate;
        }
        const start = this.timePicker24Hour() ? 0 : 1;
        const end = this.timePicker24Hour() ? 23 : 12;
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
            if (!this.timePicker24Hour()) {
                i_in_24 = selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : i === 12 ? 0 : i;
            }

            const time = selected.clone().hour(i_in_24);
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
        for (let i = 0; i < 60; i += this.timePickerIncrement()) {
            const padded = i < 10 ? '0' + i : i;
            const time = selected.clone().minute(i);

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
        if (this.timePickerSeconds()) {
            for (let i = 0; i < 60; i++) {
                const padded = i < 10 ? '0' + i : i;
                const time = selected.clone().second(i);

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
        if (!this.timePicker24Hour()) {
            if (minDate && selected.clone().hour(12).minute(0).second(0).isBefore(minDate)) {
                this.timepickerVariables[side].amDisabled = true;
            }

            if (maxDate && selected.clone().hour(0).minute(0).second(0).isAfter(maxDate)) {
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
        const month = mainCalendar.month.month();
        const year = mainCalendar.month.year();
        const hour = mainCalendar.month.hour();
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
            calendar[row][col] = curDate.clone().hour(hour).minute(minute).second(second);
            curDate.hour(12);

            const minDateValue = this.minDate();
            if (
                minDateValue &&
                calendar[row][col].format('YYYY-MM-DD') === minDateValue.format('YYYY-MM-DD') &&
                calendar[row][col].isBefore(minDateValue) &&
                side === 'left'
            ) {
                calendar[row][col] = minDateValue.clone();
            }

            const maxDateValue = this.maxDate();
            if (
                maxDateValue &&
                calendar[row][col].format('YYYY-MM-DD') === maxDateValue.format('YYYY-MM-DD') &&
                calendar[row][col].isAfter(maxDateValue) &&
                side === 'right'
            ) {
                calendar[row][col] = maxDateValue.clone();
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
        const minDate = side === 'left' ? this.minDate() : this.startDate();
        let maxDate = this.maxDate();
        // adjust maxDate to reflect the dateLimit setting in order to
        // grey out end dates beyond the dateLimit
        const dateLimit = this.dateLimit();
        if (this.endDate() === null && dateLimit) {
            const maxLimit = this.startDate().clone().add(dateLimit, 'day').endOf('day');
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
        if (this.showDropdowns()) {
            const currentMonth = calendar[1][1].month();
            const currentYear = calendar[1][1].year();
            const realCurrentYear = moment().year();
            const maxYear = (maxDate && maxDate.year()) || realCurrentYear + 5;
            const minYear = (minDate && minDate.year()) || realCurrentYear - 50;
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
            this.pickingDate = true;
            this.startDate = moment(startDate);
        }
        const timePicker = this.timePicker();
        if (!timePicker) {
            this.pickingDate = true;
            this.startDate = this.startDate().startOf('day');
        }

        const startDateValue = this.startDate();
        const timePickerIncrement = this.timePickerIncrement();
        if (timePicker && timePickerIncrement) {
            this.startDate().minute(Math.round(startDateValue.minute() / timePickerIncrement) * timePickerIncrement);
        }

        const minDate = this.minDate();
        if (minDate && startDateValue.isBefore(minDate)) {
            this.startDate = minDate.clone();
            if (timePicker && timePickerIncrement) {
                startDateValue.minute(Math.round(startDateValue.minute() / timePickerIncrement) * timePickerIncrement);
            }
        }

        const maxDate = this.maxDate();
        if (maxDate && startDateValue.isAfter(maxDate)) {
            this.startDate = maxDate.clone();
            if (timePicker && timePickerIncrement) {
                startDateValue.minute(Math.floor(startDateValue.minute() / timePickerIncrement) * timePickerIncrement);
            }
        }

        if (!this.isShown) {
            this.updateElement();
        }
        this.startDateChanged.emit({ startDate: startDateValue });
        this.updateMonthsInView();
    }

    setEndDate(endDate): void {
        if (typeof endDate === 'string') {
            this.endDate = moment(endDate, this.locale.format);
        }

        if (typeof endDate === 'object') {
            this.pickingDate = false;
            this.endDate = moment(endDate);
        }
        const timePicker = this.timePicker();
        if (!timePicker) {
            this.pickingDate = false;
            this.endDate = this.endDate().add(1, 'd').startOf('day').subtract(1, 'second');
        }

        const endDateValue = this.endDate();
        const timePickerIncrement = this.timePickerIncrement();
        if (timePicker && timePickerIncrement) {
            this.endDate().minute(Math.round(endDateValue.minute() / timePickerIncrement) * timePickerIncrement);
        }

        const startDate = this.startDate();
        if (endDateValue.isBefore(startDate)) {
            this.endDate = startDate.clone();
        }

        const maxDate = this.maxDate();
        if (maxDate && endDateValue.isAfter(maxDate)) {
            this.endDate = maxDate.clone();
        }

        const dateLimit = this.dateLimit();
        if (dateLimit && startDate.clone().add(dateLimit, 'day').isBefore(endDateValue)) {
            this.endDate = startDate.clone().add(dateLimit, 'day');
        }

        if (!this.isShown) {
            // this.updateElement();
        }
        this.endDateChanged.emit({ endDate: endDateValue });
        this.updateMonthsInView();
    }

    updateView(): void {
        if (this.timePicker()) {
            this.renderTimePicker(SideEnum.left);
            this.renderTimePicker(SideEnum.right);
        }
        this.updateMonthsInView();
        this.updateCalendars();
    }

    updateMonthsInView(): void {
        const endDate = this.endDate();
        if (endDate) {
            // if both dates are visible already, do nothing
            const startDate = this.startDate();
            const startDateValue = this.startDate();
            if (
                !this.singleDatePicker() &&
                this.leftCalendar.month &&
                this.rightCalendar.month &&
                ((startDate && this.leftCalendar && startDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM')) ||
                    (startDateValue &&
                        this.rightCalendar &&
                        startDateValue.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM'))) &&
                (endDate.format('YYYY-MM') === this.leftCalendar.month.format('YYYY-MM') ||
                    endDate.format('YYYY-MM') === this.rightCalendar.month.format('YYYY-MM'))
            ) {
                return;
            }
            if (startDateValue) {
                this.leftCalendar.month = startDateValue.clone().date(2);
                if (!this.linkedCalendars() && (endDate.month() !== startDateValue.month() || endDate.year() !== startDateValue.year())) {
                    this.rightCalendar.month = endDate.clone().date(2);
                } else {
                    this.rightCalendar.month = startDateValue.clone().date(2).add(1, 'month');
                }
            }
        } else {
            if (
                this.leftCalendar.month.format('YYYY-MM') !== this.startDate().format('YYYY-MM') &&
                this.rightCalendar.month.format('YYYY-MM') !== this.startDate().format('YYYY-MM')
            ) {
                this.leftCalendar.month = this.startDate().clone().date(2);
                this.rightCalendar.month = this.startDate().clone().date(2).add(1, 'month');
            }
        }
        const maxDate = this.maxDate();
        if (maxDate && this.linkedCalendars() && !this.singleDatePicker() && this.rightCalendar.month > maxDate) {
            this.rightCalendar.month = maxDate.clone().date(2);
            this.leftCalendar.month = maxDate.clone().date(2).subtract(1, 'month');
        }
    }

    /**
     *  This is responsible for updating the calendars
     */
    updateCalendars(): void {
        this.renderCalendar(SideEnum.left);
        this.renderCalendar(SideEnum.right);

        if (this.endDate() === null) {
            return;
        }
        this.calculateChosenLabel();
    }

    updateElement(): void {
        const format = this.locale.displayFormat ? this.locale.displayFormat : this.locale.format;
        const autoUpdateInput = this.autoUpdateInput();
        if (!this.singleDatePicker() && autoUpdateInput) {
            const startDate = this.startDate();
            const endDate = this.endDate();
            if (startDate && endDate) {
                // if we use ranges and should show range label on input
                if (
                    this.rangesArray.length &&
                    this.showRangeLabelOnInput() === true &&
                    this.chosenRange &&
                    this.locale.customRangeLabel !== this.chosenRange
                ) {
                    this.chosenLabel = this.chosenRange;
                } else {
                    this.chosenLabel = startDate.format(format) + this.locale.separator + endDate.format(format);
                }
            }
        } else if (autoUpdateInput) {
            this.chosenLabel = this.startDate().format(format);
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
                    if (this.timePicker()) {
                        const format = this.timePickerSeconds() ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm';
                        // ignore times when comparing dates if time picker seconds is not enabled
                        if (
                            this.startDate().format(format) === this.ranges[range][0].format(format) &&
                            this.endDate().format(format) === this.ranges[range][1].format(format)
                        ) {
                            customRange = false;
                            this.chosenRange = this.rangesArray[i];
                            break;
                        }
                    } else {
                        // ignore times when comparing dates if time picker is not enabled
                        if (
                            this.startDate().format('YYYY-MM-DD') === this.ranges[range][0].format('YYYY-MM-DD') &&
                            this.endDate().format('YYYY-MM-DD') === this.ranges[range][1].format('YYYY-MM-DD')
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
                if (this.showCustomRangeLabel()) {
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
        const startDate = this.startDate();
        const endDate = this.endDate();
        if (!this.singleDatePicker() && startDate && !endDate) {
            this.endDate = this._getDateWithTime(startDate, SideEnum.right);

            this.calculateChosenLabel();
        }

        if (this.isInvalidDate && startDate && endDate) {
            // get if there are invalid date between range
            const d = startDate.clone();
            while (d.isBefore(endDate)) {
                if (this.isInvalidDate(d)) {
                    this.endDate = d.subtract(1, 'days');
                    this.calculateChosenLabel();
                    break;
                }
                d.add(1, 'days');
            }
        }

        if (this.chosenLabel) {
            this.chosenDate.emit({ chosenLabel: this.chosenLabel, startDate: startDate, endDate: endDate });
        }

        this.datesUpdated.emit({ startDate: startDate, endDate: endDate });
        if (e || (this.closeOnAutoApply() && !e)) {
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
        const second = this.timePickerSeconds() ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;

        if (!this.timePicker24Hour()) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }

        const endDateValue = this.endDate();
        if (side === SideEnum.left) {
            const start = this.startDate().clone();
            start.hour(hour);
            start.minute(minute);
            start.second(second);
            this.setStartDate(start);
            const endDate = this.endDate();
            if (this.singleDatePicker()) {
                this.endDate = this.startDate().clone();
            } else if (endDate && endDate.format('YYYY-MM-DD') === start.format('YYYY-MM-DD') && endDate.isBefore(start)) {
                this.setEndDate(start.clone());
            } else if (!endDate && this.timePicker()) {
                const startClone = this._getDateWithTime(start, SideEnum.right);

                if (startClone.isBefore(start)) {
                    this.timepickerVariables[SideEnum.right].selectedHour = hour;
                    this.timepickerVariables[SideEnum.right].selectedMinute = minute;
                    this.timepickerVariables[SideEnum.right].selectedSecond = second;
                }
            }
        } else if (endDateValue) {
            const end = endDateValue.clone();
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

        if (this.autoApply()) {
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
            const startDate = this.startDate();
            if (year < this.startDate().year() || (year === startDate.year() && month < startDate.month())) {
                month = startDate.month();
                year = startDate.year();
            }
        }

        const minDate = this.minDate();
        if (minDate) {
            if (year < minDate.year() || (year === minDate.year() && month < minDate.month())) {
                month = minDate.month();
                year = minDate.year();
            }
        }

        const maxDate = this.maxDate();
        if (maxDate) {
            if (year > maxDate.year() || (year === maxDate.year() && month > maxDate.month())) {
                month = maxDate.month();
                year = maxDate.year();
            }
        }
        this.calendarVariables[side].dropdowns.currentYear = year;
        this.calendarVariables[side].dropdowns.currentMonth = month;
        if (isLeft) {
            this.leftCalendar.month.month(month).year(year);
            if (this.linkedCalendars()) {
                this.rightCalendar.month = this.leftCalendar.month.clone().add(1, 'month');
            }
        } else {
            this.rightCalendar.month.month(month).year(year);
            if (this.linkedCalendars()) {
                this.leftCalendar.month = this.rightCalendar.month.clone().subtract(1, 'month');
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
            this.leftCalendar.month.subtract(1, 'month');
            if (this.linkedCalendars()) {
                this.rightCalendar.month.subtract(1, 'month');
            }
        } else {
            this.rightCalendar.month.subtract(1, 'month');
        }
        this.updateCalendars();
    }

    /**
     * Click on next month
     * @param side left or right calendar
     */
    clickNext(side: SideEnum): void {
        if (side === SideEnum.left) {
            this.leftCalendar.month.add(1, 'month');
        } else {
            this.rightCalendar.month.add(1, 'month');
            if (this.linkedCalendars()) {
                this.leftCalendar.month.add(1, 'month');
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
        if (this.pickingDate) {
            this.nowHoveredDate = side === SideEnum.left ? leftCalDate : rightCalDate;
            this.renderCalendar(SideEnum.left);
            this.renderCalendar(SideEnum.right);
        }
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

        const startDate = this.startDate();
        const endDate = this.endDate();
        const autoApply = this.autoApply();
        const customRangeDirection = this.customRangeDirection();
        if ((endDate || (date.isBefore(startDate, 'day') && customRangeDirection === false)) && this.lockStartDate() === false) {
            // picking start
            if (this.timePicker()) {
                date = this._getDateWithTime(date, SideEnum.left);
            }
            this.endDate = null;
            this.setStartDate(date.clone());
        } else if (!endDate && date.isBefore(startDate) && customRangeDirection === false) {
            // special case: clicking the same date for start/end,
            // but the time of the end date is before the start date
            this.setEndDate(startDate.clone());
        } else {
            // picking end
            if (this.timePicker()) {
                date = this._getDateWithTime(date, SideEnum.right);
            }
            if (date.isBefore(startDate, 'day') === true && customRangeDirection === true) {
                this.setEndDate(startDate);
                this.setStartDate(date.clone());
            } else {
                this.setEndDate(date.clone());
            }

            if (autoApply) {
                this.calculateChosenLabel();
            }
        }

        if (this.singleDatePicker()) {
            this.setEndDate(startDate);
            this.updateElement();
            if (autoApply) {
                this.clickApply();
            }
        }

        this.updateView();

        if (autoApply && startDate && endDate) {
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
            this.startDate = dates[0].clone();
            this.endDate = dates[1].clone();
            if (this.showRangeLabelOnInput() && label !== this.locale.customRangeLabel) {
                this.chosenLabel = label;
            } else {
                this.calculateChosenLabel();
            }
            this.showCalInRanges = !this.rangesArray.length || this.alwaysShowCalendars();

            const timePicker = this.timePicker();
            if (!timePicker) {
                this.startDate().startOf('day');
                this.endDate().endOf('day');
            }

            const alwaysShowCalendars = this.alwaysShowCalendars();
            if (!alwaysShowCalendars) {
                this.isShown = false; // hide calendars
            }
            this.rangeClicked.emit({ label: label, dates: dates });
            if (!this.keepCalendarOpeningWithRange() || this.autoApply()) {
                this.clickApply();
            } else {
                if (!alwaysShowCalendars) {
                    return this.clickApply();
                }
                const maxDate = this.maxDate();
                if (maxDate && maxDate.isSame(dates[0], 'month')) {
                    this.rightCalendar.month.month(dates[0].month());
                    this.rightCalendar.month.year(dates[0].year());
                    this.leftCalendar.month.month(dates[0].month() - 1);
                    this.leftCalendar.month.year(dates[1].year());
                } else {
                    this.leftCalendar.month.month(dates[0].month());
                    this.leftCalendar.month.year(dates[0].year());
                    if (this.linkedCalendars() || dates[0].month() === dates[1].month()) {
                        const nextMonth = dates[0].clone().add(1, 'month');
                        this.rightCalendar.month.month(nextMonth.month());
                        this.rightCalendar.month.year(nextMonth.year());
                    } else {
                        this.rightCalendar.month.month(dates[1].month());
                        this.rightCalendar.month.year(dates[1].year());
                    }
                }
                this.updateCalendars();
                if (timePicker) {
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
        this._old.start = this.startDate().clone();
        this._old.end = this.endDate().clone();
        this.isShown = true;
        this.updateView();
    }

    hide(): void {
        this.closeDateRangePicker.emit();

        if (!this.isShown) {
            return;
        }
        // incomplete date selection, revert to last values
        const endDate = this.endDate();
        if (!endDate) {
            if (this._old.start) {
                this.startDate = this._old.start.clone();
            }
            if (this._old.end) {
                this.endDate = this._old.end.clone();
            }
        }

        // if a new date range was selected, invoke the user callback function
        if (!this.startDate().isSame(this._old.start) || !endDate.isSame(this._old.end)) {
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
        this.startDate = moment().startOf('day');
        this.endDate = moment().endOf('day');
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
            const minDate = this.minDate();
            if (!minDate) {
                return false;
            }
            return date.isBefore(minDate);
        });

        const areBothAfter = rangeMarkers.every((date) => {
            const maxDate = this.maxDate();
            if (!maxDate) {
                return false;
            }
            return date.isAfter(maxDate);
        });
        return areBothBefore || areBothAfter;
    }
    /**
     *
     * @param date the date to add time
     * @param side left or right
     */
    private _getDateWithTime(date, side: SideEnum): moment.Moment {
        let hour = parseInt(this.timepickerVariables[side].selectedHour, 10);
        if (!this.timePicker24Hour()) {
            const ampm = this.timepickerVariables[side].ampmModel;
            if (ampm === 'PM' && hour < 12) {
                hour += 12;
            }
            if (ampm === 'AM' && hour === 12) {
                hour = 0;
            }
        }
        const minute = parseInt(this.timepickerVariables[side].selectedMinute, 10);
        const second = this.timePickerSeconds() ? parseInt(this.timepickerVariables[side].selectedSecond, 10) : 0;
        return date.clone().hour(hour).minute(minute).second(second);
    }

    /**
     *  build the locale config
     */
    private _buildLocale() {
        this.locale = { ...this.locale };
        if (!this.locale.format) {
            if (this.timePicker()) {
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
            const emptyWeekRowClass = this.emptyWeekRowClass();
            if (emptyWeekRowClass && !this.hasCurrentMonthDays(this.calendarVariables[side].month, calendar[row])) {
                rowClasses.push(emptyWeekRowClass);
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
                    const lastDayOfPreviousMonthClass = this.lastDayOfPreviousMonthClass();
                    if (
                        lastDayOfPreviousMonthClass &&
                        (calendar[row][col].month() < calendar[1][1].month() || calendar[1][1].month() === 0) &&
                        calendar[row][col].date() === this.calendarVariables[side].daysInLastMonth
                    ) {
                        classes.push(lastDayOfPreviousMonthClass);
                    }

                    // mark the first day of the next month in this calendar
                    const firstDayOfNextMonthClass = this.firstDayOfNextMonthClass();
                    if (
                        firstDayOfNextMonthClass &&
                        (calendar[row][col].month() > calendar[1][1].month() || calendar[row][col].month() === 0) &&
                        calendar[row][col].date() === 1
                    ) {
                        classes.push(firstDayOfNextMonthClass);
                    }
                }
                // mark the first day of the current month with a custom class
                const firstMonthDayClass = this.firstMonthDayClass();
                if (
                    firstMonthDayClass &&
                    calendar[row][col].month() === calendar[1][1].month() &&
                    calendar[row][col].date() === calendar.firstDay.date()
                ) {
                    classes.push(firstMonthDayClass);
                }
                // mark the last day of the current month with a custom class
                const lastMonthDayClass = this.lastMonthDayClass();
                if (
                    lastMonthDayClass &&
                    calendar[row][col].month() === calendar[1][1].month() &&
                    calendar[row][col].date() === calendar.lastDay.date()
                ) {
                    classes.push(lastMonthDayClass);
                }
                // don't allow selection of dates before the minimum date
                const minDate = this.minDate();
                if (minDate && calendar[row][col].isBefore(minDate, 'day')) {
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
                const startDate = this.startDate();
                if (startDate && calendar[row][col].format('YYYY-MM-DD') === startDate.format('YYYY-MM-DD')) {
                    classes.push('active', 'start-date');
                }
                // highlight the currently selected end date
                if (this.endDate != null && calendar[row][col].format('YYYY-MM-DD') === this.endDate().format('YYYY-MM-DD')) {
                    classes.push('active', 'end-date');
                }
                // highlight dates in-between the selected dates
                if (
                    ((this.nowHoveredDate != null && this.pickingDate) || this.endDate != null) &&
                    calendar[row][col] > startDate &&
                    (calendar[row][col] < this.endDate() || (calendar[row][col] < this.nowHoveredDate && this.pickingDate)) &&
                    !classes.find((el) => el === 'off')
                ) {
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
