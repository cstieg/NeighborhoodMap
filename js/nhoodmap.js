

var viewModel = {
  address: ko.observable(),
  locationCoords: ko.observable(),



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
  }

};

ko.applyBindings(viewModel);



function initMap() {
  var uluru = {lat: -25.363, lng: 131.044};
  var mapElement = document.getElementById('map');
  var map = new google.maps.Map(mapElement, {
    zoom: 13,
    center: uluru
  });
  var marker = new google.maps.Marker({
    position: uluru,
    map: map
  });
}
