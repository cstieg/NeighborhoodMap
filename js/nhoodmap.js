

var viewModel = {
  address: ko.observable(),
  locationCoords: ko.observable(),
  map: ko.observable(),
  markers: ko.observableArray(),



  inputAddress: function(formData) {
    this.address(formData.address.value);

    var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + this.address();
    $.ajax({
      url: url,
      success: this.displayMap,
      context: this
    });

  },

  displayMap: function(result) {
    this.locationCoords(result.results[0].geometry.location);
    var mapElement = document.getElementById('map');
    var map = new google.maps.Map(mapElement, {
      zoom: 16,
      center: this.locationCoords()
    });
    var marker = new google.maps.Marker({
      position: this.locationCoords(),
      map: map,
      animation: google.maps.Animation.DROP
    });
    map.addListener('rightclick', this.addMarker);
    this.map(map);
  },

  addMarker: function(result) {
    var markerLocation = {
      lat: result.latLng.lat(),
      lng: result.latLng.lng()
    };
    var newMarker = new google.maps.Marker({
      position: markerLocation,
      map: viewModel.map()
    });
  }

};

ko.applyBindings(viewModel);
