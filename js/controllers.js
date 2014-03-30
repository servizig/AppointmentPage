(function (ng) {
    "use strict";

    ng.module("appointment.controllers", [])
        .controller("AppointmentCtrl", [
            "$rootScope", "$filter", "$scope", "ScheduleService", "MomentService",
            function ($rootScope, $filter, $scope, scheduleService, moment) {

                var reloadSchedules = function () {
                    $scope.schedules = [];
                    loadSchedules($scope.getSelectedSpecialists());
                };

                var loadSchedules = function (specialists) {
                    var startDate = $scope.getSelectedDate();
                    scheduleService.load(specialists, startDate, moment(startDate).add('days', $scope.dateSpan).toDate())
                        .then(function (schedules) {
                            $scope.schedules = $scope.schedules.concat(schedules);
                        });
                };

                // mock objects
                var vacationQuote = new Appointment.Quote("Отпуск", 3, moment().startOf('day').add('d', 2).toDate(), moment().startOf('day').add('d', 3).toDate());
                var illnessQuote = new Appointment.Quote("Врач на больничном", 3, moment().startOf('day').add('d', 2).toDate(), moment().startOf('day').add('d', 3).toDate());

                var specialityGroups = [];
                var specialities = [];


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

                $scope.specialists = [
                    new Appointment.Specialist("Анна", "Ивановна", "Петрова", therapist, [illnessQuote]),
                    new Appointment.Specialist("Людмила", "Петровна", "Буланова", therapist, [vacationQuote]),
                    new Appointment.Specialist("Зинаида", "Марковна", "Степанова", therapist, [illnessQuote]),
                    new Appointment.Specialist("Степан", "Игоревич", "Иванов", therapist, [vacationQuote]),
                    new Appointment.Specialist("Анатолий", "Борисович", "Арончиков", pediatrician, [illnessQuote])
                ];

                $scope.specialities = specialities;
                $scope.specialityGroups = specialityGroups;
                // end mock objects

                $scope.schedules = [];
                var previouslySelectedLength = 0;

                $rootScope.$on("specialists.selected", function (event, specialists) {
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
