//adding to wishlist
function addToWishlist(productId) {
  $.ajax({
    url: "/add-to-wishlist/" + productId,
    method: "get",
    success: (response) => {
      if (response.added) {
        Swal.fire({
          position: "top-center",
          icon: "success",
          title: "Item  has been Added",
          showConfirmButton: false,
          timer: 1000,
        });
      } else {
        Swal.fire({
          icon: "warning",
          text: "Already Exist in your Wishlist",
        });
      }
    },
  });
}

//remove from wishlist
function wishlistRemove(wishId, proId) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  })
    .then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: "/removeWishlist",
          data: {
            wishlist: wishId,
            product: proId,
          },
          method: "post",
          success: (response) => {},
        });
        Swal.fire("Deleted!", "Your file has been deleted.", "success");
      }
    })
    .then(() => {
      location.reload();
      $("#wishRefresh").load(window.location.href + " #wishRefresh");
    });
}

//product adding to cart
function addToCart(proId) {
  $.ajax({
    url: "/add-to-cart/" + proId,
    method: "get",
    cache: false,
    success: (response) => {
      if (response.status) {
        let count = $("#cart-count").text();
        count = parseInt(count) + 1;

        $("#cart-count").html(count);
        $("#cartRefresh").load(window.location.href + " #cartRefresh");
      }else{
        location.replace('/login')
      }
    },
  });
}

//removing product from cart
function removeProduct(cartId, proId) {
  $.ajax({
    // const _this = this;
    url: "/remove-product",
    data: {
      product: proId,
      cart: cartId,
    },
    method: "post",
    success: (response) => {
      if (response.removeProducts) {
        alert("Product Removed Successfully");
        location.reload();
      } else {
        document.getElementById(proId).innerHTML = response.removeProducts;
      }
    },
  });
}

// cancelling order
function cancelOrder(orderId, productId) {
  $.ajax({
    url: "/cancel-order",
    data: {
      order: orderId,
      product: productId,
    },
    method: "post",
    success: (response) => {
      if (response.true) {
        location.reload();
      }
      //  $( "#orderRefresh" ).load(window.location.href + " #orderRefresh" );
      location.reload();
    },
  });
}
