(function (ng, moment) {
    "use strict";

    ng.module("appointment.filters", [])
        .filter("specialist", ["$filter", function($filter) {
        return function(input, pattern) {
            if (!pattern) return input;
            pattern = pattern.toLowerCase();
            return $filter("filter")(input, function(item) {
                if (!item["firstName"]
                    || !item["middleName"]
                    || !item["lastName"]) {
                    return false;
                }
                return item.firstName.toLowerCase().indexOf(pattern) != -1
                    || item.middleName.toLowerCase().indexOf(pattern) != -1
                    || item.lastName.toLowerCase().indexOf(pattern) != -1;
            });
        }
    }]);
})(angular, moment);