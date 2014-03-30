(function (window, $, ng) {
    "use strict";

    var app = ng.module("appointment.directives", []);
    app.directive("hrShortName", function () {
        return {
            restrict: "E",
            scope: {
                name: "="
            },
            replace: true,
            template: '<span>{{ name.lastName }} {{ name.firstName[0] }}.{{ name.middleName[0] }}.</span>'
        };
    }).directive("specialistSelector", ["$rootScope", function ($rootScope) {
        return {
            restrict: "AE",
            scope: {
                specialists: "=",
                specialityGroups: "=",
                specialities: "="
            },
            templateUrl: '/html/templates/specialist-selector.html',
            controller: function ($scope) {
                console.log($rootScope);
                $scope.view = 'bySpeciality';
                $scope.isView = function (name) {
                    return $scope.view === name;
                };
                $scope.setView = function (name) {
                    $scope.view = name;
                };

                $scope.getSpecialities = function (group) {
                    return $.grep($scope.specialities, function (item) {
                        return group.name === item.group.name
                    });
                };

                $scope.getSpecialists = function (speciality) {
                    if (!speciality) return $scope.specialists;
                    return $.grep($scope.specialists, function (item) {
                        return item.speciality.code === speciality.code;
                    })
                };

                $scope.getSpecialistsInGroup = function (group) {
                    return $.grep($scope.specialists, function (item) {
                        return item.speciality.group.code === group.code;
                    });
                };

                $scope.toggleSpecialists = function (speciality) {
                    var specialists = $scope.getSpecialists(speciality);
                    var actuallyChanged = [];
                    $.each(specialists, function (_, item) {
                        if (item.selected !== speciality.selected) {
                            actuallyChanged.push(item);
                        }
                        item.selected = speciality.selected;
                    });
                    var action = speciality.selected ? "selected" : "deselected";
                    $rootScope.$emit("specialists." + action, actuallyChanged);
                };

                $scope.checkSelectAll = function (specialist, speciality) {
                    var specialists = $scope.getSpecialists(speciality);
                    speciality.selected = $.grep(specialists, function (item) {
                        return item.selected;
                    }).length == specialists.length;
                    var action = specialist.selected ? "selected" : "deselected";
                    $rootScope.$emit("specialists." + action, [specialist]);
                };

                $scope.getSelected = function () {
                    return $.grep($scope.specialists, function (item) {
                        return item.selected;
                    });
                };
            }
        };
    }]).directive("schedules", ['$timeout', function ($timeout) {
        return {
            restrict: "AE",
            scope: {
                schedules: "=items",
                scrollParentSelector: "="
            },
            templateUrl: '/html/templates/schedules.html',
            link: function (scope, element, attrs) {
                var headers;
                var maxHeight = 0;
                var breakpoints = {};

                var updateHeights = function () {
                    breakpoints = {};
                    var commonPadding = [];
                    var height = [];
                    headers = $(".ln-complex-resource-header", element);
                    var bodies = $(".ln-complex-resource-body", element);

                    $.each(headers, function (_, item) {
                        var $item = $(item);
                        var $schedule = $(".ln-complex-resource-schedule", $item);
                        commonPadding.push($item.innerHeight());
                        var top = $schedule.position().top;
                        var height = $schedule.innerHeight();
                        var breakHeight = (top + height - (height / 2)) + '';
                        if (!breakpoints[breakHeight]) {
                            breakpoints[breakHeight] = [];
                        }
                        $schedule.data('state', 'expanded');
                        breakpoints[breakHeight].push($schedule);

                        $(".ln-collapsed", $item).click(function (event) {
                            expandSchedule($schedule);
                        });
                    });

                    $.each(bodies, function(_, item) {
                        height.push($(item).innerHeight());
                    });

                    maxHeight = Math.max.apply(null, commonPadding);

                    $(".ln-complex-resource-body", element)
                        .css({
                            top: maxHeight + 'px'
                        });

                    $(".ln-complex-resource", element)
                        .css({
                            height: maxHeight + Math.max.apply(null, height) + 'px'
                        });
                };

                var expandSchedule = function(item) {
                    if (item.data('state') === 'collapsed') {
                        $('.ln-expanded', item).show();
                        $('.ln-collapsed', item).hide();
                        item.parents('.ln-complex-resource').toggleClass("expanded").toggleClass('collapsed');
                        item.data('state', 'expanded');
                    }
                };

                var collapseSchedule = function(item) {
                    if (item.data('state') === 'expanded') {
                        $('.ln-expanded', item).hide();
                        $('.ln-collapsed', item).show();
                        item.parents('.ln-complex-resource').toggleClass("expanded").toggleClass('collapsed');
                        item.data('state', 'collapsed');
                    }
                };

                scope.$watch("schedules", function () {
                    // для корректного расчета высоты блоков
                    $timeout(updateHeights, 1);
                });

                $(element).on('click', ".ln-time-scroll", function(event) {
                    var $target= $(event.target);
                    console.log("start time: ", $target.data("start-time"));
                    var timeElement = $target.parents(".ln-complex-resource")
                        .find(".ln-complex-resource-cell[data-start-time='" + $target.data("start-time") + "']");
                    // 235 - примерная высота фиксированного блока, лучше расчитывать динамически,
                    // но сложность в том, что блок будет коллапсировать при прокрутке
                    $(scope.scrollParentSelector).scrollTop(timeElement.offset().top - 235);
                });

                $(scope.scrollParentSelector).scroll(function () {
                    var scrollTop = $(this).scrollTop();
                    console.log(scrollTop);
                    headers.css({
                        top: scrollTop + "px"
                    });

                    if (scrollTop === 0) {
                        $.each(breakpoints, function (key, value) {
                            value.forEach(expandSchedule);
                        });
                    }
                    var itemsToCollapse = [];

                    $.each(breakpoints, function (key, value) {
                        if (maxHeight - parseInt(key) < (scrollTop)) {
                            console.log("key ", key);
                            console.log("value ", value);
                            itemsToCollapse = itemsToCollapse.concat(value);
                        }
                    });

                    itemsToCollapse.forEach(collapseSchedule);
                });
            }
        };
    }]).directive("schedule", [ function () {
        return {
            restrict: "AE",
            scope: {
                'item': '='
            },
            templateUrl: '/html/templates/schedule.html',
            link: function (scope, element, attrs) {
            }
        };
    }]);
})(window, jQuery, angular);