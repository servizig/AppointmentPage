(function (ng) {
    "use strict";

    var module = ng.module("appointment.controllers", []);
    module.controller("AppointmentCtrl", [
        "$rootScope", "$filter", "$scope", "ScheduleService", "MomentService",
        function ($rootScope, $filter, $scope, scheduleService, moment) {

            var reloadSchedules = function () {
                $scope.schedules = [];
                loadSchedules($scope.getSelectedSpecialists());
            };

            var loadSchedules = function (specialists) {
                console.log("loading");
                console.log(specialists);
                var startDate = $scope.getSelectedDate();
                scheduleService.load(specialists, startDate, moment(startDate).add('days', $scope.dateSpan).toDate())
                    .then(function (schedules) {
                        console.log(schedules)
                        $scope.schedules = $scope.schedules.concat(schedules);
                        console.log($scope.schedules);
                    });
            };

            // mock objects
            var specialityGroups = [];
            var specialities = [];
            var specialists = [];

            var districtGroup = new Appointment.SpecialityGroup("Участковые специалисты");
            specialityGroups.push(districtGroup);
            var ldp = new Appointment.SpecialityGroup("Специалисты ЛДП");
            specialityGroups.push(ldp);
            var laboratory = new Appointment.SpecialityGroup("Лабораторные исследования и процедуры");
            specialityGroups.push(laboratory);

            var therapist = new Appointment.Speciality("1", "Терапевт", districtGroup);
            specialities.push(therapist);
            var pediatrician = new Appointment.Speciality("2", "Врач-Педиатр", districtGroup);
            specialities.push(pediatrician);

            specialists.push(new Appointment.Specialist("Анатолий", "Борисович", "Петрова", therapist, []));
            specialists.push(new Appointment.Specialist("Людмила", "Петровна", "Буланова", therapist, []));
            specialists.push(new Appointment.Specialist("Анатолий", "Борисович", "Степанова", therapist, []));
            specialists.push(new Appointment.Specialist("Анатолий", "Борисович", "Арончиков", therapist, []));
            specialists.push(new Appointment.Specialist("Анатолий", "Борисович", "Арончиков", pediatrician, []));

            $scope.specialists = specialists;
            $scope.specialities = specialities;
            $scope.specialityGroups = specialityGroups;
            $scope.schedules = [];
            var previouslySelectedLength = 0;

            $rootScope.$on("specialists.selected", function (event, specialists) {
                console.log("selected");
                var actuallySelected = $scope.getActuallySelectedSpecialists();
                if (previouslySelectedLength == 0 && actuallySelected.length > 0) {
                    $scope.schedules = [];
                    loadSchedules($scope.getSelectedSpecialists());
                } else {
                    loadSchedules(specialists);
                }
                previouslySelectedLength = actuallySelected.length;
            });

            $rootScope.$on("specialists.deselected", function (event, specialists) {
                console.log("deselected");
                console.log(specialists);
                var actuallySelectedLength = $scope.getActuallySelectedSpecialists().length;
                if (actuallySelectedLength == 0) {
                    $scope.schedules = [];
                    previouslySelectedLength = 0;
                    loadSchedules($scope.getSelectedSpecialists());
                    return;
                }
                var newSchedules = [];
                ng.forEach($scope.schedules, function (schedule) {
                    var specialist = null;
                    for (var i = 0; i < specialists.length; i++) {
                        if (specialists[i] === schedule.specialist) {
                            specialist = specialists[i];
                            break;
                        }
                    }
                    if (specialist == null) {
                        newSchedules.push(schedule);
                    }
                });
                $scope.schedules = newSchedules;
                previouslySelectedLength = actuallySelectedLength;
            });
            $scope.dateSpan = 1;

            $scope.isDateSpan = function (dateSpan) {
                return $scope.dateSpan === dateSpan;
            };

            $scope.setDateSpan = function (dateSpan) {
                $scope.dateSpan = dateSpan;
            };

            $scope.getSelectedDate = function () {
                var momentDate = $scope.selectedDate ? moment($scope.selectedDate, 'DD.MM.yyyy') : moment();
                return momentDate.startOf('day').toDate();
            };

            $scope.getActuallySelectedSpecialists = function () {
                return $filter('filter')($scope.specialists, {selected: true});
            }

            $scope.getSelectedSpecialists = function () {
                var actuallySelected = $scope.getActuallySelectedSpecialists();
                return actuallySelected.length == 0 ? $scope.specialists : actuallySelected;
            };

            $scope.scheduleComparer = function (a, b) {
                console.log(a);
                console.log(b);
                return 0;
            };

            $scope.$watch("selectedDate", function (newValue, oldValue) {
                if (newValue === oldValue) return;
                reloadSchedules();
            });

            $scope.$watch("dateSpan", function (newValue, oldValue) {
                if (newValue === oldValue) return;
                reloadSchedules();
            });

            reloadSchedules();
        }]);
})(angular);