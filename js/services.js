(function (ng, moment) {
    "use strict";
    ng.module("appointment.services", [])
        .factory("ScheduleService", [
            "$q", "MomentService",
            function ($q, moment) {
                return {
                    load: function (specialists, beginDate, endDate) {
                        var beginDateMoment = moment(beginDate);
                        var endDateMoment = moment(endDate);

                        // симуляция загрузки расписания с сервера
                        var beginTime = new Appointment.TimeStamp(8, 0);
                        var endTime = new Appointment.TimeStamp(20, 0);
                        var facilities = [
                            new Appointment.MedicalFacility("ГП", "128", beginTime, endTime, 20),
                            new Appointment.MedicalFacility("ГП", "18", beginTime, endTime, 20),
                            new Appointment.MedicalFacility("Травм Пункт ГП", "128", beginTime, endTime, 20),
                        ];
                        var deferred = $q.defer();
                        var result = [];
                        var quotes1 = [
                            new Appointment.Quote("Доступно для записи", 1, new Appointment.TimeStamp(10, 0), new Appointment.TimeStamp(12, 0)),
                            new Appointment.Quote("Технол. перерыв", 2, new Appointment.TimeStamp(8, 0), new Appointment.TimeStamp(10, 0))
                        ];
                        var quotes2 = [
                            new Appointment.Quote("Доступно для записи", 1, new Appointment.TimeStamp(14, 20), new Appointment.TimeStamp(19, 55)),
                            new Appointment.Quote("Технол. перерыв", 2, new Appointment.TimeStamp(16, 20), new Appointment.TimeStamp(17, 5))
                        ];

                        var counter = 0;
                        ng.forEach(specialists, function (item) {
                            for (var day = beginDateMoment.clone(); day.isBefore(endDateMoment); day = day.add("days", 1)) {
                                var date = day.clone().toDate();
                                var records, schedule;

                                var place = new Appointment.Place(facilities[Math.floor(Math.random() * 3)], "" + Math.floor(Math.random() * 300));

                                if (counter++ % 2 === 1) {
                                    records = [
                                        new Appointment.Record(new Date(date), new Appointment.TimeStamp(10, 30), "Кукушкин Н.Г."),
                                        new Appointment.Record(new Date(date), new Appointment.TimeStamp(11, 0), "Петров Н.Г.")
                                    ];
                                    schedule = new Appointment.SpecialistPlaceDate(
                                        item, place, new Date(date), beginTime.addHours(0), endTime.addHours(-8), new Appointment.TimeStamp(0, 5), ng.copy(quotes1), records);
                                } else {
                                    records = [
                                        new Appointment.Record(new Date(date), new Appointment.TimeStamp(17, 30), "Петров Н.Г."),
                                        new Appointment.Record(new Date(date), new Appointment.TimeStamp(15, 30), "Кукушкин Н.Г."),
                                        new Appointment.Record(new Date(date), new Appointment.TimeStamp(15, 30), "Петров Н.Г.")
                                    ];
                                    schedule = new Appointment.SpecialistPlaceDate(
                                        item, place, new Date(date), beginTime.addHours(6), endTime.addHours(0), new Appointment.TimeStamp(0, 5), ng.copy(quotes2), records);
                                }
                                result.push(schedule);
                            }
                        });
                        deferred.resolve(result);
                        return deferred.promise;
                    }
                };
            }]).factory("MomentService", [ function () {
            return moment;
        }]);
})(angular, moment);
