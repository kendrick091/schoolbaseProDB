function paySchoolFees() {
  const handler = PaystackPop.setup({
    key: window.PAYSTACK_KEY,
    email: window.SCHOOL_EMAIL,
    amount: window.TOTAL_SCHOOL_FEE * 100,
    currency: 'NGN',
    metadata: { paymentType: 'school_bulk' },
    callback: function(response) {
      fetch('/fees/verify-school-payment', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: response.reference })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Payment successful! School marked as paid.');
          location.reload();
        } else {
          alert('Payment verification failed.');
        }
      });
    }
  });
  handler.openIframe();
}
