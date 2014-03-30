(function ($, ng) {
    "use strict";
    var beginTime = new Appointment.TimeStamp(8, 0);
    var endTime = new Appointment.TimeStamp(20, 0);
    ng.module("appointment", [
        "ng-bootstrap3-datepicker",
        "appointment.services",
        "appointment.controllers",
        "appointment.filters",
        "appointment.directives"])
        .constant("MODEL", {
            facilities: [
                new Appointment.MedicalFacility("ГП", "128", beginTime, endTime, 20),
                new Appointment.MedicalFacility("ГП", "18", beginTime, endTime, 20),
                new Appointment.MedicalFacility("Травм Пункт ГП", "128", beginTime, endTime, 20)
            ]
        });
})(jQuery, angular);