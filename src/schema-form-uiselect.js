angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {

            var uiselect = function (name, schema, options) {
                if (schema.type === 'string' && schema.format == 'uiselect') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'uiselect';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.string.unshift(uiselect);

            var uiselect = function (name, schema, options) {
                if (schema.type === 'number' && schema.format == 'uiselect') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'uiselect';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.number.unshift(uiselect);

            var uimultiselect = function (name, schema, options) {
                if (schema.type === 'array' && schema.format == 'uiselect') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'uimultiselect';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };
            schemaFormProvider.defaults.array.unshift(uimultiselect);


            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'uiselect',
                'directives/decorators/bootstrap/uiselect/single.html');
            schemaFormDecoratorsProvider.createDirective('uiselect',
                'directives/decorators/bootstrap/uiselect/single.html');
            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'uimultiselect',
                'directives/decorators/bootstrap/uiselect/multi.html');
            schemaFormDecoratorsProvider.createDirective('uimultiselect',
                'directives/decorators/bootstrap/uiselect/multi.html');
        }])
    .directive("toggleSingleModel", function ($timeout) {
        // some how we get this to work ...
        return {
            require: 'ngModel',
            restrict: "A",
            scope: {},
            replace: true,
            controller: ['$scope', function ($scope) {

                /**
                 * Selects active option when:
                 * a) model value is changed
                 * b) dropdown options are changed
                 *
                 * @param {string} val Selected value
                 * @param {bool} doResetIfNotFound Boolean - if true and value not found in options list dropdown value is reset
                 */
                var doSelect = function (val, doResetIfNotFound) {

                    if (!angular.isDefined(val)) {
                        // value not passed (or empty value passed) - reset dropdown value
                        $scope.$parent.select_model.selected = undefined;
                    } else {

                        // value passed, check if it is available in the options list, if so - select it
                        var exists = false;
                        angular.forEach($scope.$parent.form.schema.items, function ($item) {
                            if ($item.value == val) {
                                $scope.$parent.select_model.selected = $item;
                                exists = true;
                            }
                        });

                        // value is not found in options list and flag (that dropdown should be reset) is passed, reset value
                        if (!exists && doResetIfNotFound) {
                            $scope.$parent.select_model.selected = undefined;
                        }

                        if ($scope.$parent.ngModel.$$parentForm.$pristine) {
                            $timeout(function () {
                                $scope.$parent.ngModel ? $scope.$parent.ngModel.$setPristine() : false;
                                $scope.$parent.ngModel && $scope.$parent.ngModel.$$parentForm ? $scope.$parent.ngModel.$$parentForm.$setPristine() : false;
                            });
                        }
                    }
                };

                var getModelKey = function () {

                    var key = $scope.$parent.form.key;

                    // Redact part of the key, used in arrays
                    // KISS keyRedaction is a number.
                    if ($scope.$parent.state && $scope.$parent.state.keyRedaction) {
                        key = key.slice($scope.$parent.state.keyRedaction);
                    } else if (Array.isArray(key)) {
                        key = key[0];
                    }

                    return key;
                };

                // model value changed in outside
                $scope.$parent.$watch('model.$$value$$'.replace('$$value$$', getModelKey()), function (val) {
                    doSelect(val, false);
                });

                // select items changed
                $scope.$parent.$watch('form.schema.items', function (newVal, oldVal) {
                    if ($scope.$parent.model && $scope.$parent.model[getModelKey()]) {
                        var val = $scope.$parent.model[getModelKey()];
                        var filter = function (el) {
                            return el.value === val;
                        };

                        if (filter) {
                            var exists = newVal.filter(filter);
                            if (exists.length === 0 && oldVal) {
                                var toAdd = oldVal.filter(filter);
                                if (toAdd.length > 0) {
                                    newVal.splice(oldVal.indexOf(toAdd[0]), 0, toAdd[0]);
                                }
                            }

                            var selectedIndex = newVal.map(function (e) { return e.value; }).indexOf(val);
                            $scope.$emit('ui.select.selectItem', selectedIndex);
                        }

                        doSelect($scope.$parent.model[getModelKey()], false);
                    }
                }, true);

                $scope.$parent.$watch('select_model.selected', function () {
                    $scope.$parent.insideModel = $scope.$parent.select_model.selected ? $scope.$parent.select_model.selected.value : undefined;
                    $scope.$parent.ngModel.$setViewValue($scope.$parent.select_model.selected ? $scope.$parent.select_model.selected.value : undefined);
                });

                $scope.$on('$destroy', function () {
                    $scope.$parent.form.schema.items = [];
                });
            }],
        };
    })
    .directive("toggleModel", function ($timeout) {
        // some how we get this to work ...
        return {
            require: 'ngModel',
            restrict: "A",
            scope: {},
            replace: true,
            controller: ['$scope', 'sfSelect', function ($scope, sfSelect) {
                var list = sfSelect($scope.$parent.form.key, $scope.$parent.model);
                //as per base array implemenation if the array is undefined it must be set as empty for data binding to work
                if (angular.isUndefined(list)) {
                    list = [];
                    sfSelect($scope.$parent.form.key, $scope.$parent.model, list);
                }

                var doSelect = function (selectedItems, doResetIfNotFound) {

                    if (doResetIfNotFound) {
                        // clean selected options
                        while ($scope.$parent.form.select_models.length) {
                            $scope.$parent.form.select_models.pop();
                        }
                    }

                    // reselect values
                    angular.forEach($scope.$parent.form.schema.items, function ($item) {
                        angular.forEach(selectedItems, function (selectedItem) {

                            var existing = $scope.$parent.form.select_models.filter(function (existing) {
                                return existing.value == selectedItem;
                            });

                            if (existing.length === 0 && $item.value == selectedItem) {
                                $scope.$parent.form.select_models.push($item);
                            }
                        });
                    });

                    if ($scope.$parent.ngModel.$$parentForm.$pristine && angular.isDefined(selectedItems) && selectedItems.length) {
                        $timeout(function () {
                            $scope.$parent.ngModel ? $scope.$parent.ngModel.$setPristine() : false;
                            $scope.$parent.ngModel && $scope.$parent.ngModel.$$parentForm ? $scope.$parent.ngModel.$$parentForm.$setPristine() : false;
                        });
                    }
                };

                var getModelKey = function () {

                    var key = $scope.$parent.form.key;

                    // Redact part of the key, used in arrays
                    // KISS keyRedaction is a number.
                    if ($scope.$parent.state && $scope.$parent.state.keyRedaction) {
                        key = key.slice($scope.$parent.state.keyRedaction);
                    } else if (Array.isArray(key)) {
                        key = key[0];
                    }

                    return key;
                };

                // model value changed in outside
                $scope.$parent.$watch('model.$$value$$'.replace('$$value$$', getModelKey()), function (val) {
                    doSelect(val, true);
                });

                // select items changed
                $scope.$parent.$watch('form.schema.items', function (val) {
                    if ($scope.$parent.model && $scope.$parent.model[getModelKey()]) {
                        doSelect($scope.$parent.model[getModelKey()]);
                    }
                }, true);

                $scope.$parent.$watch('form.select_models', function () {
                    if ($scope.$parent.form.select_models.length == 0) {
                        $scope.$parent.insideModel = $scope.$parent.$$value$$;
                        if ($scope.$parent.ngModel.$viewValue != undefined) {
                            $scope.$parent.ngModel.$setViewValue($scope.$parent.form.select_models);
                        }
                    } else {
                        $scope.$parent.insideModel = $scope.$parent.form.select_models;
                        $scope.$parent.ngModel.$setViewValue($scope.$parent.form.select_models);
                    }
                }, true);


                $scope.$on('$destroy', function () {
                    $scope.$parent.form.schema.items = [];
                });
            }],
        };
    })
    .filter('whereMulti', function () {
        return function (items, key, values) {
            var out = [];

            if (angular.isArray(values)) {
                values.forEach(function (value) {
                    for (var i = 0; i < items.length; i++) {
                        if (value == items[i][key]) {
                            out.push(items[i]);
                            break;
                        }
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    })
    .filter('propsFilter', function () {
        return function (items, props) {
            var out = [];

            if (angular.isArray(items)) {
                items.forEach(function (item) {
                    var itemMatches = false;

                    var keys = Object.keys(props);
                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        if (item.hasOwnProperty(prop)) {
                            //only match if this property is actually in the item to avoid
                            var text = props[prop].toLowerCase();
                            //search for either a space before the text or the textg at the start of the string so that the middle of words are not matched
                            if (item[prop] && item[prop].toString().toLowerCase().indexOf(text) === 0 || (item[prop] && (item[prop].toString()).toLowerCase().indexOf(' ' + text) !== -1)) {
                                itemMatches = true;
                                break;
                            }
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    })
    .controller('UiSelectController', ['$scope', '$http', function ($scope, $http) {

        $scope.fetchResult = function (schema, options, search) {
            if (options) {
                if (options.callback) {
                    var cb_func = (typeof options.callback == 'function') ?
                        options.callback : new Function(options.callback);

                    schema.items = cb_func(schema, options, search);
                }
                else if (options.http_post) {
                    return $http.post(options.http_post.url, options.http_post.parameter).then(
                        function (_data) {
                            schema.items = _data.data;
                        },
                        function (data, status) {
                            alert("Loading select items failed (URL: '" + String(options.http_post.url) +
                                "' Parameter: " + String(options.http_post.parameter) + "\nError: " + status);
                        });
                }
                else if (options.http_get) {
                    return $http.get(options.http_get.url, options.http_get.parameter).then(
                        function (_data) {
                            schema.items = _data.data;
                        },
                        function (data, status) {
                            alert("Loading select items failed (URL: '" + String(options.http_get.url) +
                                "\nError: " + status);
                        });
                }
                else if (options.async) {
                    var cb_func = (typeof options.async.call == 'function') ?
                        options.async.call : new Function(options.async.call);

                    return cb_func(schema, options, search).then(
                        function (_data) {
                            schema.items = _data.data;
                        },
                        function (data, status) {
                            alert("Loading select items failed(Options: '" + String(options) +
                                "\nError: " + status);
                        });
                }

            }
        };
    }])
