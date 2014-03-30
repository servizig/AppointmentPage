(function ($, ng) {
    "use strict";

    var app = ng.module("appointment", [
        "ng-bootstrap3-datepicker",
        "appointment.services",
        "appointment.controllers",
        "appointment.filters",
        "appointment.directives"]);
})(jQuery, angular);