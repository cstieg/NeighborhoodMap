/*
 * Uses Knockout.js, which has MVVM structure:
 *  Model - stored data
 *  ViewModel - the data and functions
 *  View - the HTML with bindings to VM data and functions
 */
var viewModel = {
  // Initializes data in Knockout observables, which automatically refreshes html
  // Data is persisted to localStorage by knockout.localStorage.js
  init: function() {
    this.address = ko.observable(null, {persist: 'address'});
    this.locationCoords = ko.observable(null, {persist: 'locationCoords'});
    this.map = ko.observable();
    this.markerLocations = ko.observableArray(null, {persist: 'markerLocations'});
    this.markers = ko.observableArray();
  },

  // Takes an address from the user and uses Google Maps API to convert it to a
  // latitutude/longitude location
  inputAddress: function(formData) {
    this.address(formData.address.value);

    var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + this.address();
    $.ajax({
      url: url,
      success: this.addressSuccess,
      context: this
    });

  },

  // on success inputting address, display map centered on lat/long of address
  addressSuccess: function(result) {
    this.locationCoords(result.results[0].geometry.location);
    this.displayMap(this.locationCoords());
  },

  // displays a map centered at a given location with a marker on that location
  displayMap: function(location = viewModel.locationCoords()) {
    if (!location) {
      return;
    }
    var mapElement = document.getElementById('map');
    var map = new google.maps.Map(mapElement, {
      zoom: 16,
      center: location
    });
    var marker = new google.maps.Marker({
      position: location,
      map: map,
      animation: google.maps.Animation.DROP
    });
    // rightclick adds a user-defined marker
    map.addListener('rightclick', this.addMarker);
    this.map(map);
    this.displayMarkers();
  },

  // adds a marker from a click event
  addMarker: function(result) {
    var markerLocation = {
      lat: result.latLng.lat(),
      lng: result.latLng.lng()
    };
    var newMarker = new google.maps.Marker({
      position: markerLocation,
      map: viewModel.map()
    });
    viewModel.markerLocations.push(markerLocation);
    viewModel.markers.push(newMarker);
  },

  // displays all markers based on stored marker locations
  displayMarkers: function() {
    var vm = this;
    vm.markers.removeAll();
    vm.markerLocations().forEach(function(markerLocation) {
      var newMarker = new google.maps.Marker({
        position: markerLocation,
        map: viewModel.map()
      });
      vm.markers.push(newMarker);
    });
  }

};

// initialize viewModel
viewModel.init();
ko.applyBindings(viewModel);

// callback function from initial map call in index.html
function initialMap() {
  viewModel.displayMap();
}
