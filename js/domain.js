var Appointment = Appointment || {};

(function (Appointment) {
    "use strict";

    function pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    /**
     * Создает экземпляр Specialist (Специалист)
     *
     * @param {String} firstName Имя
     * @param {String} middleName Отчество
     * @param {String} lastName Фамилия
     * @param {Appointment.Speciality} speciality Специальность
     * @param {Array} cancellingQuotes Массив отменяющих квот
     * @constructor
     */
    Appointment.Specialist = function (firstName, middleName, lastName, speciality, cancellingQuotes) {
        this.firstName = firstName;
        this.middleName = middleName;
        this.lastName = lastName;
        this.speciality = speciality;
        this.cancellingQuotes = cancellingQuotes || [];
    };

    /**
     * Создает экземпляр Speciality (Специальность)
     *
     * @param {String} code код
     * @param {String} name название
     * @param {Appointment.SpecialityGroup} group группа
     * @constructor
     */
    Appointment.Speciality = function (code, name, group) {
        this.code = code;
        this.name = name;
        this.group = group;
    };

    /**
     * Создает экземпляр SpecialityGroup (Группа специальностей)
     *
     * @param {String} name название
     * @constructor
     */
    Appointment.SpecialityGroup = function (name) {
        this.name = name;
    };

    /**
     * Создает экземпляр Quote (квота)
     *
     * @param {String} name название
     * @param {Number} type тип
     * @param {Appointment.TimeStamp || Date} startTime  время начала действия
     * @param {Appointment.TimeStamp || Date} endTime время окончания действия
     * @constructor
     */
    Appointment.Quote = function (name, type, startTime, endTime) {
        this.name = name;
        this.type = type;
        this.startTime = startTime;
        this.endTime = endTime;
    };

    /**
     * Возвращает признак принадлежности квоты к запрещающим
     *
     * @returns {boolean}
     */
    Appointment.Quote.prototype.isProhibiting = function () {
        return this.type === 2;
    };

    /**
     * Возвращает признак принадлежности квоты к разрешающим
     *
     * @returns {boolean}
     */
    Appointment.Quote.prototype.isAllowing = function () {
        return this.type === 1;
    };

    /**
     * Создает экземпляр SpecialistPlaceDate (Специалист-Место-Дата)
     *
     * @param {Appointment.Specialist} specialist специалист
     * @param {Appointment.Place} place место
     * @param {Date} date дата
     * @param {Appointment.TimeStamp} workBeginTime время начала работы
     * @param {Appointment.TimeStamp} workEndTime время окончания работы
     * @param {Appointment.TimeStamp} scheduleStep шаг сетки расписания
     * @param {Array} quotes массив запрещающих и разрешающих квот
     * @param {Array} records массив записей пациентов
     * @constructor
     */
    Appointment.SpecialistPlaceDate = function (specialist, place, date, workBeginTime, workEndTime, scheduleStep, quotes, records) {
        var facility = place.facility;
        if (workBeginTime.compareTo(facility.workBeginTime) == -1) {
            throw new Error("Invalid schedule begin work time: earlier than facility begin work time");
        }
        if (workEndTime.compareTo(facility.workEndTime) == 1) {
            throw new Error("Invalid schedule end work time: later than facility end work time");
        }

        this.type = 1;
        this.specialist = specialist;
        this.place = place;
        this.date = date;
        this.workBeginTime = workBeginTime;
        this.workEndTime = workEndTime;
        this.scheduleStep = scheduleStep;
        this.quotes = quotes || [];
        this.records = records;
        var cancellingQuote = this.specialist.cancellingQuotes.filter(function (quote) {
            return quote.startTime <= date && quote.startTime >= date
                || quote.endTime <= date && quote.endTime >= date;
        })[0];
        if (cancellingQuote === undefined) {
            this.calculateSlots();
        } else {
            this.type = 2;
            this.cancelReason = cancellingQuote.name;
            this.fillCancellingSlots()
        }
    };

    /**
     * Выполняет расчет блоков для записи. Результаты расчета сохраняются в свойстве slots.
     */
    Appointment.SpecialistPlaceDate.prototype.calculateSlots = function () {
        var self = this;
        this.slots = [];
        var facility = this.place.facility;
        var scheduleStep = this.scheduleStep;

        var isAccepted = function (timeStamp) {
            var timeStampMinutes = timeStamp.getMinutes() % scheduleStep.getTotalMinutes() === 0
                ? scheduleStep.getTotalMinutes()
                : timeStamp.getMinutes() % scheduleStep.getTotalMinutes();
            var percent = (timeStampMinutes / scheduleStep.getTotalMinutes()) * 100;
            return percent >= (100 - facility.intersectAcceptance);
        };

        // 1 блок "Врач не принимает", если му работает раньше
        if (this.workBeginTime.compareTo(facility.workBeginTime) > 0) {
            this.slots.push({
                schedule: self,
                time: facility.workBeginTime,
                type: 1
            });
        }
        // 1 блок "Врач не принимает", если му работает позже
        if (this.workEndTime.compareTo(facility.workEndTime) < 0) {
            this.slots.push({
                schedule: self,
                time: this.workEndTime,
                type: 1
            });
        }

        // создать предварительный список слотов
        var preSlots = [];
        for (var step = this.workBeginTime; step.compareTo(this.workEndTime) < 0; step = step.add(this.scheduleStep)) {
            preSlots.push({
                schedule: self,
                time: step,
                type: 0
            });
        }

        // получить запрещающие квоты
        var prohibitingQuotes = this.quotes.filter(function (x) {
            return x.isProhibiting();
        });
        prohibitingQuotes.forEach(function (quote) {
            // удалить из предварительных слотов те, которые попадают в запрещающую квоту
            preSlots = preSlots.filter(function (slot) {
                return slot.type === 0
                    && (!slot.time.belongsTo(quote.startTime, quote.endTime, true)
                        || (quote.endTime.laterThan(slot.time, true) && quote.endTime.earlierThan(slot.time.add(scheduleStep), false)));
            });

            // найти слот, в который входит начало запрещающей квоты
            var beginningSlot = preSlots.filter(function (slot) {
                return slot.type === 0 && quote.startTime.belongsTo(slot.time, slot.time.add(scheduleStep), true);
            })[0];

            if (beginningSlot === undefined) {
                console.log("beginning slot for quote not found: " + quote.name);
            } else {
                // вычислить допустимый коэффициент
                // если коэффициент меньше установленного, то установить слоту статус "Нет записи"
                if (!isAccepted(quote.startTime, scheduleStep)) {
                    beginningSlot.type = 5;
                    beginningSlot.reason = "Нет записи";
                }
            }

            // найти слот, в который входит конец запрещающей квоты
            var endingSlot = preSlots.filter(function (slot) {
                return slot.type === 0 && quote.endTime.belongsTo(slot.time, slot.time.add(scheduleStep), true);
            })[0];

            // установить минуты равные равные минутам конца квоты
            if (endingSlot !== undefined && !endingSlot.time.equalsTo(quote.endTime)) {
                endingSlot.time = new Appointment.TimeStamp(endingSlot.time.getHours(), quote.endTime.getMinutes());
                endingSlot.type = 5;
                endingSlot.reason = "Нет записи";
            } else {
                console.log("ending slot for quote not found: " + quote.name)
            }
            // добавить в предварительный список слотов слот с квотой
            preSlots.push({
                schedule: self,
                time: quote.startTime,
                type: 5,
                reason: quote.name
            });
        });

        // получить разрешающие квоты
        var allowingQuotes = this.quotes.filter(function (x) {
            return x.isAllowing();
        });

        allowingQuotes.forEach(function (quote) {
            // получить список слотов, которые не помечены как запрещенные
            var slots = preSlots.filter(function (x) {
                return x.type === 0;
            });
            // получить слот, в который входит конец разрешающей квоты
            var endingSlot = slots.filter(function (x) {
                return quote.endTime.belongsTo(x.time, x.time.add(scheduleStep), true);
            })[0];
            // вычислить допустимый коэффициент
            // если коэффициент меньше установленного, установить квоте статус "Нет записи"
            if (endingSlot && !isAccepted(quote.endTime, scheduleStep)) {
                endingSlot.type = 5;
                endingSlot.reason = "Нет записи";
            } else {
                endingSlot.type = 10;
            }
            // пометить все необработанные квоты как квоты доступные для записи
            slots.forEach(function (slot) {
                if (slot !== endingSlot
                    && slot.type === 0
                    && slot.time.laterThan(quote.startTime, true)
                    && slot.time.earlierThan(quote.endTime, false)) {
                    slot.type = 10;
                }
            });
        });
        // удалить все непроверенные слоты
        preSlots.forEach(function (x) {
            if (x.type === 0) {
                x.type = 5;
                x.reason = "Нет записи";
            }
        });

        this.slots = this.slots.concat(preSlots);
        // сортировка блоков по времени
        this.slots.sort(function (a, b) {
            return a.time.compareTo(b.time)
        });
        var records = this.records;
        this.slots
            .filter(function (x) {
                return x.type === 10;
            })
            .forEach(function (slot) {
                slot.records = records.filter(function (record) {
                    return slot.time.equalsTo(record.timeStamp);
                });
            });
    };

    /**
     * Заполняет слоты записями, которые нужно отменить
     */
    Appointment.SpecialistPlaceDate.prototype.fillCancellingSlots = function () {
        var slots = this.slots = [];
        var self = this;

        this.records.forEach(function (record) {
            var slot = slots.filter(function (x) {
                return x.time.equalsTo(record.timeStamp);
            })[0];
            if (slot === undefined) {
                slot = {
                    schedule: self,
                    time: record.timeStamp,
                    type: 10,
                    records: []
                };
                slots.push(slot);
            }
            slot.records.push(record);
        });

        // сортировка блоков по времени
        this.slots.sort(function (a, b) {
            return a.time.compareTo(b.time)
        });
    };

    /**
     * Создает экземляр Place (Место)
     *
     * @param {Appointment.MedicalFacility} facility медицинское учреждение
     * @param {String} roomNumber номер кабинет
     * @constructor
     */
    Appointment.Place = function (facility, roomNumber) {
        this.facility = facility;
        this.roomNumber = roomNumber;
    };

    /**
     * Создает экземпляр MedicalFacility (Медицинское учреждение)
     *
     * @param {String} shortName сокращенное наименование
     * @param {String} number номер
     * @param {Appointment.TimeStamp} workBeginTime время начала работы
     * @param {Appointment.TimeStamp} workEndTime время окончания работы
     * @param {Number} intersectAcceptance допустимый процент пересечения временных интервалов
     * @constructor
     */
    Appointment.MedicalFacility = function (shortName, number, workBeginTime, workEndTime, intersectAcceptance) {
        this.shortName = shortName;
        this.number = number;
        this.workBeginTime = workBeginTime;
        this.workEndTime = workEndTime;
        this.intersectAcceptance = intersectAcceptance;
    };

    /**
     * Создает экземпляр Record (запись пациента)
     * @param {Date} day день
     * @param {Appointment.TimeStamp} timeStamp время
     * @param {String} patientLastName ФИО пациента
     * @constructor
     */
    Appointment.Record = function (day, timeStamp, patientLastName) {
        this.day = day;
        this.timeStamp = timeStamp;
        this.patientName = patientLastName;
    };

    /**
     * Создает экземпляр TimeStamp (время)
     *
     * @param {Number} hour час
     * @param {Number} minute минута
     * @constructor
     */
    Appointment.TimeStamp = function (hour, minute) {
        /* @private */
        this._minutesCount = hour * 60 + minute;
    };

    /**
     * Устанавливает максимальное допустимое значение типа время
     * Максимальное время - 23:59
     * @type {number}
     */
    Appointment.TimeStamp.MAX_VALUE = 24 * 60 - 1;

    /**
     * Прибавляет к текущему времени указанное время. Возвращает новый объект.
     *
     * @param other время, которое нужно прибавить
     * @returns {Appointment.TimeStamp} прибавленное время
     */
    Appointment.TimeStamp.prototype.add = function (other) {
        return this.addMinutes(other._minutesCount);
    };

    /**
     * Прибавляет к текущему времени указанное количество часов и возвращает новое время
     * Исходное время не меняется
     * @param {Number} hoursCount количество часов, которое нужно прибавить
     * @returns {Appointment.TimeStamp} Новое время
     */
    Appointment.TimeStamp.prototype.addHours = function (hoursCount) {
        return this.addMinutes(60 * hoursCount);
    };

    /**
     * Прибавляет к текущему времени указанное количество минут и возвращает новое время
     * Исходное время не меняется
     * @param {Number} minutesCount
     * @returns {Appointment.TimeStamp} Новое время
     */
    Appointment.TimeStamp.prototype.addMinutes = function (minutesCount) {
        var newMinutesCount = this._minutesCount + minutesCount;
        var newTimeStamp = new Appointment.TimeStamp(0, newMinutesCount);
        if (newMinutesCount > Appointment.TimeStamp.MAX_VALUE
            || newMinutesCount < 0)
            throw new Error("Invalid resulting time: '" + newTimeStamp.toString() + "'");
        return newTimeStamp;
    };

    /**
     * Возвращает часы текущего времени
     *
     * @returns {number}
     */
    Appointment.TimeStamp.prototype.getHours = function () {
        return Math.floor(this._minutesCount / 60);
    };

    /**
     * Возвращает минуты текущего времени
     *
     * @returns {number}
     */
    Appointment.TimeStamp.prototype.getMinutes = function () {
        return this._minutesCount % 60;
    };

    /**
     * Возвращает полное количество минут текущего времени
     * Например:
     *      4:00.getTotalMinutes() => 240
     *
     * @returns {number}
     */
    Appointment.TimeStamp.prototype.getTotalMinutes = function () {
        return this._minutesCount;
    };

    /**
     * Возвращает отформатированное значение времени. Например, 08:15
     * @returns {string}
     */
    Appointment.TimeStamp.prototype.toString = function () {
        return pad(this.getHours(), 2) + ":" + pad(this.getMinutes(), 2);
    };

    /**
     * Сравнивает текущее время с другим временем
     * Возвращает -1 если другое время больше текущего, 0 если равны, 1 если текущее время больше другого
     * @param {Appointment.TimeStamp} other
     * @returns {number} результат сравнения
     */
    Appointment.TimeStamp.prototype.compareTo = function (other) {
        if (this._minutesCount === other._minutesCount) return 0;
        return this._minutesCount < other._minutesCount ? -1 : 1;
    };

    /**
     * Сравнивает текущее время с другим временем
     * Возвращает true если время совпадает, иначе false
     * @param other
     * @returns {boolean} результат сравнения
     */
    Appointment.TimeStamp.prototype.equalsTo = function (other) {
        return this.compareTo(other) === 0;
    };

    /**
     * Определяет, какое время раньше: текущий объект или other
     * При проверке можно указать строго сравнивать или нет
     * Например:
     *     15:00.earlierThan(15:00, true) => true
     *     15:00.earlierThan(15:00, false) => false
     *
     * @param  {Appointment.TimeStamp} other объект, с которым сравнивается текущий
     * @param  {boolean} strict признак строгого сравнения
     * @return {boolean} результат сравнения: true - текущий раньше other, иначе false
     */
    Appointment.TimeStamp.prototype.earlierThan = function (other, strict) {
        if (strict) {
            return this.compareTo(other) <= 0;
        } else {
            return this.compareTo(other) < 0;
        }
    };

    /**
     * Определяет, какое время позже: текущий объект или other
     * При проверке можно указать строго сравнивать или нет
     * Например:
     *     15:00.laterThan(15:00, true) => true
     *     15:00.laterThan(15:00, false) => false
     *
     * @param  {Appointment.TimeStamp} other объект, с которым сравнивается текущий
     * @param  {boolean} strict признак строгого сравнения
     * @return {boolean} результат сравнения: true - текущий позже other, иначе false
     */
    Appointment.TimeStamp.prototype.laterThan = function (other, strict) {
        if (strict) {
            return this.compareTo(other) >= 0;
        } else {
            return this.compareTo(other) > 0;
        }
    };

    /**
     * Определяет принадлежность к промежутку времени
     * При проверке можно указать, проверять ли границы промежутка.
     * Например:
     *     15:00 будет входить в промежуток [15:00, 16:00] если установлен признак includeBoundaries;
     *     15:00 не будет входить в промежуток (15:00, 16:00) если признак не установлен
     *
     * @param  {Appointment.TimeStamp} startTime начало промежутка
     * @param  {Appointment.TimeStamp} endTime окончание промежутка
     * @param  {boolean} includeBoundaries признак включения границ промежутка в проверку
     * @return {boolean} результат проверки: true - входит в промежуток, false - не входит в промежуток
     */
    Appointment.TimeStamp.prototype.belongsTo = function (startTime, endTime, includeBoundaries) {
        if (includeBoundaries) {
            return startTime.compareTo(this) <= 0 && endTime.compareTo(this) >= 0;
        } else {
            return startTime.compareTo(this) < 0 && endTime.compareTo(this) > 0;
        }
    };
})(Appointment);
