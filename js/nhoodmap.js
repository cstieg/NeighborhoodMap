

var viewModel = {
  address: ko.observable(),




  inputAddress: function(formData) {
    this.address(formData.address.value);
  }
};

ko.applyBindings(viewModel);
