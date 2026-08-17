function paySchoolFees() {

    const term = document.getElementById("paymentTerm").value;

    if (!term) {
        alert("Please select the term you want to pay for.");
        return;
    }

    const handler = PaystackPop.setup({

        key: window.PAYSTACK_KEY,

        email: window.SCHOOL_EMAIL,

        amount: window.TOTAL_SCHOOL_FEE * 100,

        currency: 'NGN',

        metadata: {
            paymentType: "school_bulk",
            term
        },

        callback: function(response){

            fetch('/fees/verify-school-payment',{

                method:'POST',

                credentials:'same-origin',

                headers:{
                    'Content-Type':'application/json'
                },

                body:JSON.stringify({

                    reference: response.reference,

                    term

                })

            })
            .then(res=>res.json())
            .then(data=>{

                if(data.success){

                    alert("Payment Successful");

                    location.reload();

                }else{

                    alert(data.message);

                }

            });

        }

    });

    handler.openIframe();

}

function updateStudentPaymentButtons() {

    const selectedTerm =
        document.getElementById(
            'studentPaymentTerm'
        ).value;


    const buttons =
        document.querySelectorAll(
            '.pay-student-btn'
        );


    buttons.forEach(button => {

        const payments =
            JSON.parse(
                button.dataset.payments
            );


        // No term selected
        if (!selectedTerm) {

            button.textContent =
                'Choose Term';

            button.disabled =
                true;

            return;

        }


        // Check payment for selected term
        const paid =
            payments.some(
                payment =>
                    payment.term ===
                    selectedTerm
            );


        if (paid) {

            button.textContent =
                'Already Paid';

            button.disabled =
                true;

            button.style.background =
                '#198754';

        } else {

            button.textContent =
                'Pay ₦350';

            button.disabled =
                false;

            button.style.background =
                '#0d6efd';

        }

    });

}