(function (window, $, ng) {
    "use strict";

    ng.module("appointment.directives", [])
        .directive("hrShortName", function () {
            return {
                restrict: "E",
                scope: {
                    name: "="
                },
                replace: true,
                template: '<span>{{ name.lastName }} {{ name.firstName[0] }}.{{ name.middleName[0] }}.</span>'
            };
        }).directive("specialistSelector", [ function () {
            return {
                restrict: "AE",
                scope: {
                    specialists: "=",
                    specialityGroups: "=",
                    specialities: "=",
                    onSelected: '&onSelected',
                    onDeselected: '&onDeselected'
                },
                templateUrl: 'templates/specialist-selector.html',
                controller: function ($scope) {
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
                        console.log(actuallyChanged)
                        if (speciality.selected && $scope.onSelected) $scope.onSelected()(actuallyChanged);
                        if (!speciality.selected && $scope.onDeselected) $scope.onDeselected()(actuallyChanged);
                    };

                    $scope.checkSelectAll = function (specialist, speciality) {
                        var specialists = $scope.getSpecialists(speciality);
                        speciality.selected = $.grep(specialists, function (item) {
                            return item.selected;
                        }).length == specialists.length;

                        if (specialist.selected && $scope.onSelected) $scope.onSelected()([specialist]);
                        if (!specialist.selected && $scope.onDeselected) $scope.onDeselected()([specialist]);
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
                templateUrl: 'templates/schedules.html',
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

                        $.each(bodies, function (_, item) {
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

                    var expandSchedule = function (item) {
                        if (item.data('state') === 'collapsed') {
                            $('.ln-expanded', item).show();
                            $('.ln-collapsed', item).hide();
                            item.parents('.ln-complex-resource').toggleClass("expanded").toggleClass('collapsed');
                            item.data('state', 'expanded');
                        }
                    };

                    var collapseSchedule = function (item) {
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

                    scope.getSlotClasses = function (slot) {
                        var classes = [ 'ln-complex-resource-cell-' + slot.type ];
                        if (slot.records !== undefined && slot.records.length > 0) {
                            classes.push('ln-cell-has-records');
                        }
                        return classes;
                    };

                    $(element).on('click', ".ln-time-scroll", function (event) {
                        var $target = $(event.target);
                        var timeElement = $target.parents(".ln-complex-resource")
                            .find(".ln-complex-resource-cell[data-start-time='" + $target.data("start-time") + "']");
                        // 235 - примерная высота фиксированного блока, лучше расчитывать динамически,
                        // но сложность в том, что блок будет коллапсировать при прокрутке
                        $(scope.scrollParentSelector).scrollTop(timeElement.offset().top - 235);
                    });

                    $(element).on('contextmenu', '.ln-complex-resource-cell-10', function (event) {
                        event.preventDefault();
                        $(".ln-selected").removeClass("ln-selected");

                        var $contextMenuTarget = $(event.target);
                        if ($contextMenuTarget.hasClass("time")
                            || $contextMenuTarget.hasClass("ln-records-wrapper")) {
                            $contextMenuTarget = $contextMenuTarget.parents(".ln-complex-resource-cell");
                        }
                        var $contextMenu = $('.ln-context-menu', element);
                        var eventScope = ng.element($contextMenuTarget).scope();
                        $(".ln-context-action", $contextMenu).hide();

                        if (eventScope.record) {
                            $(".ln-action-record-view", $contextMenu).show();
                            $(".ln-action-record-change", $contextMenu).show();
                            $(".ln-action-record-cancel", $contextMenu).show();
                            $(".ln-action-record-cut", $contextMenu).show();
                            $(".ln-action-record-copy", $contextMenu).show();
                        }

                        if (eventScope.slot && eventScope.slot.schedule.type === 1) {
                            $(".ln-action-create", $contextMenu).show();
                        }

                        var offset = $(event.target).offset();

                        var cursor = {
                            y: event.clientY,
                            x: event.clientX
                        };
                        var menu = {
                            height: $contextMenu.height(),
                            width: $contextMenu.width()
                        };
                        var w = {
                            height: $(window).height(),
                            width: $(window).width()
                        };
                        var position = {
                            top: cursor.y - (cursor.y + menu.height > w.height ? menu.height + 20 : 0),
                            left: cursor.x - (cursor.x + menu.width > w.width ? menu.width : 0)
                        };
                        $contextMenu.css(position).show();
                        $contextMenuTarget.addClass("ln-selected");

                        $(document).one('click', function (event) {
                            $contextMenu.hide();
                            $contextMenuTarget.removeClass("ln-selected");
                        });
                    });

                    $(scope.scrollParentSelector).scroll(function () {
                        var scrollTop = $(this).scrollTop();
                        $(".ln-complex-resource-spacer", element).css({
                            top: scrollTop + "px"
                        });
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
                                itemsToCollapse = itemsToCollapse.concat(value);
                            }
                        });

                        itemsToCollapse.forEach(collapseSchedule);
                    });
                }
            };
        }]);
})(window, jQuery, angular);
