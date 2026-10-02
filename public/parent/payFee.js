// ==========================================
// ELEMENTS
// ==========================================

const sessionSelect =
    document.getElementById('sessionId');

const termSelect =
    document.getElementById('term');

const schoolFee =
    document.getElementById('schoolFee');

const totalFee =
    document.getElementById('totalFee');

const amountPaid =
    document.getElementById('amountPaid');

const remainingAmount =
    document.getElementById('remainingAmount');

const amountInput =
    document.getElementById('amount');

const paymentSection =
    document.getElementById('paymentSection');

const completedMessage =
    document.getElementById('completedMessage');

const formSessionId =
    document.getElementById('formSessionId');

const formTerm =
    document.getElementById('formTerm');


// ==========================================
// FORMAT MONEY
// ==========================================

function formatMoney(amount) {

    return '₦' +
        Number(amount || 0)
            .toLocaleString();

}


// ==========================================
// UPDATE FEE DISPLAY
// ==========================================

function updateFeeDisplay() {

    const sessionId =
        sessionSelect.value;

    const term =
        termSelect.value;


    const key =
        `${sessionId}_${term}`;


    const selectedFee =
        Number(
            fees[term] || 0
        );


    const summary =
        paymentSummary[key] || {
            totalPaid: 0
        };


    const paid =
        Number(
            summary.totalPaid || 0
        );


    const remaining =
        Math.max(
            selectedFee - paid,
            0
        );


    // ==========================================
    // DISPLAY
    // ==========================================

    schoolFee.textContent =
        formatMoney(selectedFee);

    totalFee.textContent =
        formatMoney(selectedFee);

    amountPaid.textContent =
        formatMoney(paid);

    remainingAmount.textContent =
        formatMoney(remaining);


    // ==========================================
    // SEND SESSION + TERM TO FORM
    // ==========================================

    formSessionId.value =
        sessionId;

    formTerm.value =
        term;


    // ==========================================
    // FULLY PAID
    // ==========================================

    if (
        selectedFee > 0 &&
        paid >= selectedFee
    ) {

        paymentSection.classList.add(
            'hidden'
        );

        completedMessage.classList.remove(
            'hidden'
        );

        amountInput.value = '';

    }

    else {

        paymentSection.classList.remove(
            'hidden'
        );

        completedMessage.classList.add(
            'hidden'
        );


        // ==========================================
        // PREVENT FRONTEND OVERPAYMENT
        // ==========================================

        amountInput.max =
            remaining;

    }

}


// ==========================================
// SESSION CHANGE
// ==========================================

sessionSelect.addEventListener(
    'change',
    updateFeeDisplay
);


// ==========================================
// TERM CHANGE
// ==========================================

termSelect.addEventListener(
    'change',
    updateFeeDisplay
);


// ==========================================
// PAYMENT FORM
// ==========================================

document
    .getElementById('paymentForm')
    .addEventListener(
        'submit',
        function (e) {

            const sessionId =
                sessionSelect.value;

            const term =
                termSelect.value;


            const selectedFee =
                Number(
                    fees[term] || 0
                );


            const key =
                `${sessionId}_${term}`;


            const summary =
                paymentSummary[key] || {
                    totalPaid: 0
                };


            const paid =
                Number(
                    summary.totalPaid || 0
                );


            const remaining =
                Math.max(
                    selectedFee - paid,
                    0
                );


            const amount =
                Number(
                    amountInput.value
                );


            // ==========================================
            // VALIDATE AMOUNT
            // ==========================================

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                e.preventDefault();

                alert(
                    'Please enter a valid payment amount.'
                );

                return;

            }


            // ==========================================
            // PREVENT OVERPAYMENT
            // ==========================================

            if (
                amount > remaining
            ) {

                e.preventDefault();

                alert(
                    `You can only pay ₦${remaining.toLocaleString()} for this term.`
                );

                return;

            }


            // ==========================================
            // DISABLE BUTTON
            // ==========================================

            const payButton =
                document.getElementById(
                    'payButton'
                );


            if (payButton) {

                payButton.disabled =
                    true;

                payButton.textContent =
                    'Connecting to Paystack...';

            }

        }
    );


// ==========================================
// INITIAL DISPLAY
// ==========================================

updateFeeDisplay();