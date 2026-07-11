const qtyValue = document.querySelector('.qty-value');
const subtotal = document.getElementById('subtotal');
const qtyButtons = document.querySelectorAll('.qty-btn');
let quantity = 1;
let price = 149;

function updateCart() {
  if (qtyValue) {
    qtyValue.textContent = quantity;
  }
  if (subtotal) {
    subtotal.textContent = `$${price * quantity}`;
  }
}

qtyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.action === 'increase') {
      quantity += 1;
    } else if (quantity > 1) {
      quantity -= 1;
    }
    updateCart();
  });
});

updateCart();
